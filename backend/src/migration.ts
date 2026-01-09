import 'reflect-metadata';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { Handler } from 'aws-lambda';

type MigrationResult = {
  applied: string[];
  skipped: string[];
};

/** drizzle の SQL マイグレーションを SQLite に適用する Lambda ハンドラー。 */
export const handler: Handler = (): Promise<MigrationResult> => {
  const sqlitePath = process.env.SQLITE_PATH ?? '/mnt/efs/todo.db';
  const defaultSourceDir = fs.existsSync(path.resolve(__dirname, '../db/migration'))
    ? path.resolve(__dirname, '../db/migration')
    : path.resolve(__dirname, '../db/drizzle');
  const sourceDir = resolvePath(process.env.MIGRATION_SOURCE_DIR, defaultSourceDir, process.cwd());
  const defaultHistory = path.resolve('/tmp', 'db/migration/migration_history.csv');
  const historyPath = resolvePath(process.env.MIGRATION_HISTORY_PATH, defaultHistory, '/tmp');

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`migration source directory not found: ${sourceDir}`);
  }

  const migrationFiles = fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const appliedHistory = readHistory(historyPath);
  const db = new Database(sqlitePath);

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of migrationFiles) {
    if (appliedHistory.has(file)) {
      skipped.push(file);
      continue;
    }
    const sql = fs.readFileSync(path.join(sourceDir, file), 'utf-8');
    applySql(db, sql);
    appendHistory(historyPath, file, new Date().toISOString());
    applied.push(file);
  }

  return Promise.resolve({ applied, skipped });
};

const readHistory = (historyPath: string): Set<string> => {
  try {
    const content = fs.readFileSync(historyPath, 'utf-8');
    const [, ...lines] = content.split('\n').filter((line) => line.length > 0);
    return new Set(lines.map((line) => line.split(',')[0]));
  } catch {
    ensureHistoryFile(historyPath);
    return new Set();
  }
};

const ensureHistoryFile = (historyPath: string) => {
  const dir = path.dirname(historyPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, 'migration_name,migrated_date\n', 'utf-8');
  }
};

const appendHistory = (historyPath: string, name: string, executedAt: string) => {
  ensureHistoryFile(historyPath);
  fs.appendFileSync(historyPath, `${name},${executedAt}\n`, 'utf-8');
};

const resolvePath = (input: string | undefined, fallback: string, base: string) => {
  if (!input) return fallback;
  if (path.isAbsolute(input)) return input;
  return path.resolve(base, input);
};

const applySql = (db: Database.Database, sql: string) => {
  db.exec('BEGIN');
  try {
    db.exec(sql);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};
