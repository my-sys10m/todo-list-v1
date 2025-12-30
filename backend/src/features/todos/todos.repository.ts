import { Inject, Injectable } from '@nestjs/common';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { DRIZZLE_DB } from '../../database/database.tokens';

@Injectable()
export class TodosRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: BetterSQLite3Database,
  ) {}

  async insertTodo(data: { projectId: string; userId: string; title: string; status?: number }) {
    // TODO: implement INSERT using drizzle schema (t_todo)
    return {
      id: 'todo-id',
      projectId: data.projectId,
      userId: data.userId,
      title: data.title,
      status: data.status ?? 0,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async findById(id: string, userId: string) {
    // TODO: SELECT ... WHERE id/userId/is_deleted=false
    return {
      id,
      projectId: 'project-id',
      userId,
      title: 'todo',
      status: 0,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async queryByUser(userId: string, date?: string) {
    // TODO: SELECT list with optional date range
    return [
      {
        id: 'todo-id',
        projectId: 'project-id',
        userId,
        title: 'todo',
        status: 0,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  async updateById(id: string, userId: string, dto: any) {
    // TODO: UPDATE ... WHERE id/userId
    return {
      id,
      projectId: 'project-id',
      userId,
      title: dto.title ?? 'todo',
      status: dto.status ?? 0,
      isDeleted: dto.isDeleted ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async softDelete(id: string, userId: string) {
    // TODO: UPDATE is_deleted=true WHERE id/userId
    return true;
  }
}
