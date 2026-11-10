import { MongoClient, type Collection, type Db } from "mongodb";
import type { Config } from "./config.js";
import type { AuthEventDoc, ContactDoc, FeedbackDoc, HistoryDoc, TaskDoc, UserDoc } from "./types.js";

/** The only thing the rest of the app depends on — easy to fake in tests. */
export interface Stores {
  users: Collection<UserDoc>;
  events: Collection<AuthEventDoc>;
  history: Collection<HistoryDoc>;
  feedback: Collection<FeedbackDoc>;
  tasks: Collection<TaskDoc>;
  contacts: Collection<ContactDoc>;
}

export interface DbHandle {
  stores: Stores;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export async function connectMongo(cfg: Config): Promise<DbHandle> {
  const client = new MongoClient(cfg.mongoUri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  // Uses the database named in the URI (".../CROPNEXUS"); falls back to CROPNEXUS.
  const db: Db = client.db(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/.exec(cfg.mongoUri)?.[1] || "CROPNEXUS");
  const stores: Stores = {
    users: db.collection<UserDoc>(cfg.usersCollection), // "USERS"
    events: db.collection<AuthEventDoc>("AUTH_EVENTS"),
    history: db.collection<HistoryDoc>("HISTORY"),
    feedback: db.collection<FeedbackDoc>("FEEDBACK"),
    tasks: db.collection<TaskDoc>("TASKS"),
    contacts: db.collection<ContactDoc>("CONTACT_MESSAGES"),
  };
  await stores.users.createIndex({ email: 1 }, { unique: true });
  await stores.events.createIndex({ at: -1 });
  await stores.events.createIndex({ type: 1, at: -1 });
  await stores.history.createIndex({ userId: 1, createdAt: -1 });
  await stores.feedback.createIndex({ userId: 1 });
  await stores.feedback.createIndex({ status: 1, createdAt: -1 });
  await stores.tasks.createIndex({ userId: 1, dueDate: 1 });
  await stores.contacts.createIndex({ createdAt: -1 });
  return {
    stores,
    ping: async () => {
      try {
        await db.command({ ping: 1 });
        return true;
      } catch {
        return false;
      }
    },
    close: () => client.close(),
  };
}
