# CropNexus AI service (FastAPI + TensorFlow + scikit-learn)  ->  build from the PROJECT ROOT:
#   docker build -t cropnexus-ml .
#   docker run --rm -p 8080:8080 -e ML_SERVICE_KEY=$(openssl rand -hex 24) cropnexus-ml
# Works as-is on Google Cloud Run, Railway, Render (Docker), Fly.io, Koyeb, or any VPS.
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    TF_ENABLE_ONEDNN_OPTS=0 \
    ML_REQUIRE_KEY=true

WORKDIR /srv
COPY ml_service/requirements.txt ml_service/requirements.txt
RUN pip install -r ml_service/requirements.txt

# Only what the service needs at run time (see .dockerignore): code, trained models, knowledge base, metrics.
COPY ml_service/main.py ml_service/soil.py ml_service/
COPY app/leaf_disease_architecture.py app/soil_architecture.py app/
COPY app/model app/model
COPY app/database/crop_info.json app/database/leaf_disease_info.json app/database/
COPY models/metrics.json models/
COPY models/leaf_disease/metrics.json models/leaf_disease/
COPY models/soil/metrics.json models/soil/

RUN useradd --create-home --uid 10001 appuser && chown -R appuser /srv
USER appuser
WORKDIR /srv/ml_service

EXPOSE 8080
# Cloud Run / Railway / Render inject $PORT; 8080 is the fallback.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --timeout-keep-alive 65"]
