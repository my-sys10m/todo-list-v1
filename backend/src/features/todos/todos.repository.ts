import { Inject, Injectable } from '@nestjs/common';
import { and, eq, like, gte, lte } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { DRIZZLE_DB } from '../../database/database.tokens';
import { todosTable } from '../../schemas/todo';
import { TodoStatus } from './todos.dto';

type TodoRow = typeof todosTable.$inferSelect;
type TodoInsert = typeof todosTable.$inferInsert;
type TodoUpdateInput = {
  title?: string;
  status?: TodoStatus;
  isDeleted?: boolean;
};

/** TODO 永続化に使用するエンティティ。 */
export interface TodoEntity {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  status: TodoStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** TODO を SQLite 上で永続化するリポジトリ。 */
@Injectable()
export class TodosRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: BetterSQLite3Database,
  ) {}

  /** TODO を新規作成し永続化済みエンティティを返す。 */
  insertTodo(data: {
    projectId: string;
    userId: string;
    title: string;
    status?: TodoStatus;
    createdAt?: string;
    updatedAt?: string;
  }): Promise<TodoEntity> {
    const now = new Date().toISOString();
    const createdAt = data.createdAt ?? now;
    const updatedAt = data.updatedAt ?? createdAt;
    const values: TodoInsert = {
      projectId: Number(data.projectId),
      userId: data.userId,
      title: data.title,
      status: data.status ?? TodoStatus.NotStarted,
      isDeleted: false,
      createdAt,
      updatedAt,
    };
    const row = this.db.insert(todosTable).values(values).returning().get();
    if (!row) {
      throw new Error('failed to insert todo');
    }
    return Promise.resolve(this.mapTodo(row));
  }

  /** ユーザー所有の指定 ID の TODO を 1 件取得する。 */
  findById(id: string, userId: string): Promise<TodoEntity | null> {
    const row = this.db
      .select()
      .from(todosTable)
      .where(and(eq(todosTable.id, Number(id)), eq(todosTable.userId, userId), eq(todosTable.isDeleted, false)))
      .get();
    return Promise.resolve(row ? this.mapTodo(row) : null);
  }

  /** ユーザーの TODO 一覧を日付フィルタ込みで取得する。 */
  queryByUser(userId: string, date?: string): Promise<TodoEntity[]> {
    const where = [eq(todosTable.userId, userId), eq(todosTable.isDeleted, false)];
    if (date) {
      where.push(like(todosTable.createdAt, `${date}%`));
    }
    const rows = this.db.select().from(todosTable).where(and(...where)).all();
    return Promise.resolve(rows.map(this.mapTodo));
  }

  /** 条件付き検索を実行し、最大 limit 件を取得する。 */
  search(
    userId: string,
    filters: {
      title?: string;
      status?: TodoStatus;
      createdFrom?: string;
      createdTo?: string;
      updatedFrom?: string;
      updatedTo?: string;
    },
    limit: number,
  ): Promise<TodoEntity[]> {
    const where = [eq(todosTable.userId, userId), eq(todosTable.isDeleted, false)];
    if (filters.title) {
      where.push(like(todosTable.title, `%${filters.title}%`));
    }
    if (filters.status !== undefined) {
      where.push(eq(todosTable.status, filters.status));
    }
    if (filters.createdFrom) {
      where.push(gte(todosTable.createdAt, filters.createdFrom));
    }
    if (filters.createdTo) {
      where.push(lte(todosTable.createdAt, filters.createdTo));
    }
    if (filters.updatedFrom) {
      where.push(gte(todosTable.updatedAt, filters.updatedFrom));
    }
    if (filters.updatedTo) {
      where.push(lte(todosTable.updatedAt, filters.updatedTo));
    }
    const rows = this.db.select().from(todosTable).where(and(...where)).limit(limit).all();
    return Promise.resolve(rows.map(this.mapTodo));
  }

  /** TODO を部分更新し更新済みエンティティを返す。 */
  updateById(id: string, userId: string, dto: TodoUpdateInput): Promise<TodoEntity | null> {
    const updateValues: Partial<TodoInsert> = { updatedAt: new Date().toISOString() };
    if (dto.title !== undefined) {
      updateValues.title = dto.title;
    }
    if (dto.status !== undefined) {
      updateValues.status = dto.status;
    }
    if (dto.isDeleted !== undefined) {
      updateValues.isDeleted = dto.isDeleted;
    }
    const row = this.db
      .update(todosTable)
      .set(updateValues)
      .where(and(eq(todosTable.id, Number(id)), eq(todosTable.userId, userId), eq(todosTable.isDeleted, false)))
      .returning()
      .get();
    return Promise.resolve(row ? this.mapTodo(row) : null);
  }

  /** TODO を論理削除としてフラグ更新し、成功可否を返す。 */
  softDelete(id: string, userId: string): Promise<boolean> {
    const result = this.db
      .update(todosTable)
      .set({ isDeleted: true, updatedAt: new Date().toISOString() })
      .where(and(eq(todosTable.id, Number(id)), eq(todosTable.userId, userId), eq(todosTable.isDeleted, false)))
      .run();
    return Promise.resolve(result.changes > 0);
  }

  private mapTodo = (row: TodoRow): TodoEntity => ({
    id: row.id.toString(),
    projectId: row.projectId.toString(),
    userId: row.userId,
    title: row.title,
    status: row.status as TodoStatus,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
