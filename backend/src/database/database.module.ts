import { Global, Module } from '@nestjs/common';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as path from 'path';
import { loadEnv } from '../config/env';
import { DRIZZLE_DB, SQLITE_CONNECTION } from './database.tokens';

const defaultDbPath = path.resolve(__dirname, '..', '..', 'db', 'todo.sqlite');

@Global()
@Module({
  providers: [
    {
      provide: SQLITE_CONNECTION,
      useFactory: () => {
        loadEnv();
        const dbPath = process.env.SQLITE_PATH || defaultDbPath;
        return new Database(dbPath);
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [SQLITE_CONNECTION],
      useFactory: (sqlite: Database.Database): BetterSQLite3Database => drizzle(sqlite),
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
