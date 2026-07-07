// Overview: Opens the local SQLite database and exposes a small database client interface.

import { open, type DB, type QueryResult, type Scalar, type SQLBatchTuple } from '@op-engineering/op-sqlite';

export type DatabaseClient = {
  execute(query: string, params?: Scalar[]): Promise<QueryResult>;
  executeBatch(commands: SQLBatchTuple[]): Promise<unknown>;
};

let database: DB | null = null;

// Opens the app database once and reuses it for all repositories.
export function getActivityDatabase(): DatabaseClient {
  if (!database) {
    database = open({ name: 'activity_tracker.sqlite' });
  }

  return database;
}
