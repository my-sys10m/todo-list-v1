import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { Global, Module } from '@nestjs/common';
import yaml from 'js-yaml';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { DRIZZLE_DB } from '../database/database.tokens';
import { ProjectsModule } from '../features/projects/projects.module';
import { TodosModule } from '../features/todos/todos.module';
import { createSwaggerDocument, getSwaggerPath } from '../swagger';

const outputDir = path.resolve(__dirname, '..', '..', 'docs');

const writeSwaggerFile = (filePath: string, contents: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

/** Swagger ドキュメント生成用に DB 依存をモックしたモジュール。 */
const createMockDatabase = (): BetterSQLite3Database => {
  return {} as BetterSQLite3Database;
};

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useFactory: createMockDatabase,
    },
  ],
  exports: [DRIZZLE_DB],
})
class SwaggerDatabaseModule {}

@Module({
  imports: [SwaggerDatabaseModule, TodosModule, ProjectsModule],
})
class SwaggerAppModule {}

const exportSwagger = async () => {
  // eslint-disable-next-line no-console
  console.log('Generating Swagger document...');

  const app = await NestFactory.create(SwaggerAppModule, { logger: ['error', 'warn', 'log'] });
  await app.init();

  const document = createSwaggerDocument(app);

  const jsonPath = path.join(outputDir, 'openapi.json');
  const yamlPath = path.join(outputDir, 'openapi.yaml');

  writeSwaggerFile(jsonPath, JSON.stringify(document, null, 2));
  writeSwaggerFile(yamlPath, yaml.dump(document));

  await app.close();

  // eslint-disable-next-line no-console
  console.log(`Swagger exported to ${jsonPath} and ${yamlPath}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger UI remains available at /${getSwaggerPath()}`);
};

exportSwagger().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to export Swagger document', err);
  process.exit(1);
});
