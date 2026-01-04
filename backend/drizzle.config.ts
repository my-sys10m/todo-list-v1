import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schemas/**/*.ts',
  out: './db/drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: process.env.SQLITE_PATH ?? './db/todo.sqlite' },
});
