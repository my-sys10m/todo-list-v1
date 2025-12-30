"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleTable = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.sampleTable = (0, sqlite_core_1.sqliteTable)('sample', {
    id: (0, sqlite_core_1.integer)('id').primaryKey(),
    objects: (0, sqlite_core_1.text)('objects').notNull(),
});
