import { Inject, Injectable } from '@nestjs/common';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { DRIZZLE_DB } from '../../database/database.tokens';

@Injectable()
export class ProjectsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: BetterSQLite3Database) {}

  async insertProject(data: { userId: string; name: string }) {
    // TODO: implement with drizzle schema (t_project)
    return { id: 'project-id', userId: data.userId, name: data.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }

  async updateProject(id: string, userId: string, dto: { name?: string }) {
    // TODO: implement update logic
    return dto.name ? { id, userId, name: dto.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : null;
  }

  async softDelete(id: string, userId: string) {
    // TODO: implement soft delete (is_deleted flag)
    return true;
  }

  async findById(id: string, userId: string) {
    // TODO: select project by id/user
    return { id, userId, name: 'project', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }

  async listByUser(userId: string) {
    // TODO: select all projects for userId
    return [
      { id: 'project-id', userId, name: 'project', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
  }
}
