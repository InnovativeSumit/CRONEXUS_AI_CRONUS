"""
CropNexus — Authentication
Users are stored in MongoDB (database "CROPNEXUS", collection "USERS" by
default — matching the names you already created in Compass). Passwords are
hashed with bcrypt before ever touching the database. The web app uses a
Flask session cookie; the mobile app uses a signed JWT sent as a Bearer
token, since it has no cookie jar shared with a browser.
"""
import os
import datetime
from functools import wraps

import bcrypt
import jwt
from bson import ObjectId
from flask import session, request, redirect, url_for, jsonify, g
from pymongo import MongoClient
from pymongo.errors import PyMongoError

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/CROPNEXUS")
USERS_COLLECTION = os.environ.get("MONGO_USERS_COLLECTION", "USERS")
JWT_SECRET = os.environ.get("JWT_SECRET", "cropnexus-dev-jwt-secret-change-me")
JWT_ALGO = "HS256"
JWT_EXPIRY_DAYS = 30

_client = None
_users_collection = None
_last_mongo_error = None


def get_users_collection():
    """Lazily connects on first use (so the app still boots even if MongoDB
    isn't running yet) and caches the connection afterwards."""
    global _client, _users_collection, _last_mongo_error
    if _users_collection is not None:
        return _users_collection
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)
        client.admin.command("ping")
        db = client.get_default_database()
        collection = db[USERS_COLLECTION]
        collection.create_index("email", unique=True)
        _client = client
        _users_collection = collection
        _last_mongo_error = None
        return _users_collection
    except PyMongoError as e:
        _last_mongo_error = str(e)
        return None


def mongo_status():
    """For a health-check / friendly error message when Mongo is unreachable."""
    ok = get_users_collection() is not None
    return {"connected": ok, "error": _last_mongo_error}


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------
def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------
class AuthError(Exception):
    """Raised for expected auth failures (bad input, duplicate email, db down)."""


def create_user(name: str, email: str, password: str) -> dict:
    users = get_users_collection()
    if users is None:
        raise AuthError(f"Couldn't reach the database. Check MONGO_URI and that MongoDB is running. ({_last_mongo_error})")

    name = (name or "").strip()
    email = (email or "").strip().lower()
    if not name or not email or not password:
        raise AuthError("Name, email and password are all required.")
    if len(password) < 6:
        raise AuthError("Password must be at least 6 characters.")
    if users.find_one({"email": email}):
        raise AuthError("An account with that email already exists.")

    doc = {
        "name": name,
        "email": email,
        "password": hash_password(password),
        "created_at": datetime.datetime.utcnow(),
    }
    result = users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def authenticate_user(email: str, password: str) -> dict:
    users = get_users_collection()
    if users is None:
        raise AuthError(f"Couldn't reach the database. Check MONGO_URI and that MongoDB is running. ({_last_mongo_error})")

    email = (email or "").strip().lower()
    user = users.find_one({"email": email})
    if not user or not verify_password(password, user.get("password", "")):
        raise AuthError("Incorrect email or password.")
    return user


def find_user_by_id(user_id: str):
    users = get_users_collection()
    if users is None:
        return None
    try:
        return users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


def public_user(user_doc: dict) -> dict:
    if not user_doc:
        return None
    return {
        "id": str(user_doc["_id"]),
        "name": user_doc.get("name"),
        "email": user_doc.get("email"),
    }


# ---------------------------------------------------------------------------
# JWT (used by the mobile app)
# ---------------------------------------------------------------------------
def issue_token(user_id) -> str:
    now = datetime.datetime.utcnow()
    payload = {"sub": str(user_id), "iat": now, "exp": now + datetime.timedelta(days=JWT_EXPIRY_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


# ---------------------------------------------------------------------------
# Decorators
# ---------------------------------------------------------------------------
def login_required(view):
    """Gates a web (HTML) route behind a logged-in session cookie."""
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


def api_login_required(view):
    """Gates a JSON API route behind a Bearer JWT (used by the mobile app)."""
    @wraps(view)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header[7:].strip() if auth_header.startswith("Bearer ") else None
        user_id = decode_token(token) if token else None
        if not user_id:
            return jsonify({"error": "Please log in again — your session has expired or is invalid."}), 401
        g.user_id = user_id
        return view(*args, **kwargs)
    return wrapped
