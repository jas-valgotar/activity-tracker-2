// Overview: Provides a sql.js-backed DatabaseClient for exercising repositories in Jest.

import initSqlJs, { type BindParams, type Database, type SqlJsStatic } from 'sql.js';
import type { DatabaseClient } from '../src/data/database';

type Scalar = string | number | boolean | null | ArrayBuffer | ArrayBufferView;
type SQLBatchTuple = [string] | [string, Scalar[]] | [string, Scalar[][]];

let sqlJs: SqlJsStatic | null = null;

// Loads the sql.js module once for all repository tests.
async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJs) {
    sqlJs = await initSqlJs();
  }

  return sqlJs;
}

// Creates a fresh in-memory SQLite database client.
export async function createSqliteTestClient(): Promise<DatabaseClient> {
  const SQL = await getSqlJs();
  return new SqliteTestClient(new SQL.Database());
}

// Adapts a sql.js database to the app's minimal DatabaseClient interface.
class SqliteTestClient implements DatabaseClient {
  // Stores the underlying in-memory sql.js database.
  constructor(private readonly db: Database) {}

  // Executes one SQL statement and maps sql.js rows to the OP-SQLite-shaped result.
  async execute(query: string, params: Scalar[] = []) {
    const statement = this.db.prepare(query);
    statement.bind(params as BindParams);
    const rows: Record<string, Scalar>[] = [];

    while (statement.step()) {
      rows.push(statement.getAsObject() as Record<string, Scalar>);
    }

    statement.free();

    return {
      rowsAffected: this.db.getRowsModified(),
      rows,
    };
  }

  // Executes batch statements inside a transaction to mirror the app database client.
  async executeBatch(commands: SQLBatchTuple[]) {
    this.db.run('BEGIN TRANSACTION');

    try {
      for (const command of commands) {
        const [query, params] = command;
        if (Array.isArray(params?.[0])) {
          for (const paramSet of params as Scalar[][]) {
            await this.execute(query, paramSet);
          }
        } else {
          await this.execute(query, (params as Scalar[] | undefined) ?? []);
        }
      }

      this.db.run('COMMIT');
      return { rowsAffected: this.db.getRowsModified() };
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }
}
