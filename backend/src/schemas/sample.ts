import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sampleTable = sqliteTable('sample', {
  id: integer('id').primaryKey(),
  objects: text('objects').notNull(),
});
