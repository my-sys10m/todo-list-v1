import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { DRIZZLE_DB } from '../../database/database.tokens';
import { projectsTable } from '../../schemas/todo';

type ProjectRow = typeof projectsTable.$inferSelect;
type ProjectInsert = typeof projectsTable.$inferInsert;
type ProjectUpdateInput = {
  name?: string;
};

/** プロジェクト永続化のためのエンティティ。 */
export interface ProjectEntity {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** プロジェクトを SQLite 上で CRUD するリポジトリ。 */
@Injectable()
export class ProjectsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: BetterSQLite3Database) {}

  /** 指定ユーザーに紐づくプロジェクトを新規作成する。 */
  async insertProject(data: { userId: string; name: string; createdAt?: string; updatedAt?: string }): Promise<ProjectEntity> {
    const now = new Date().toISOString();
    const createdAt = data.createdAt ?? now;
    const updatedAt = data.updatedAt ?? createdAt;
    const values: ProjectInsert = {
      userId: data.userId,
      name: data.name,
      createdAt,
      updatedAt,
    };
    const row = await this.db.insert(projectsTable).values(values).returning().get();
    if (!row) {
      throw new Error('failed to insert project');
    }
    return this.mapProject(row);
  }

  /** プロジェクト名を更新し、更新後のレコードを返す。 */
  async updateProject(id: string, userId: string, dto: ProjectUpdateInput): Promise<ProjectEntity | null> {
    const updateValues: Partial<ProjectInsert> = { updatedAt: new Date().toISOString() };
    if (dto.name !== undefined) {
      updateValues.name = dto.name;
    }
    const row = await this.db
      .update(projectsTable)
      .set(updateValues)
      .where(and(eq(projectsTable.id, Number(id)), eq(projectsTable.userId, userId)))
      .returning()
      .get();
    return row ? this.mapProject(row) : null;
  }

  /** プロジェクト削除を実行し削除可否を返す。 */
  async softDelete(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(projectsTable).where(and(eq(projectsTable.id, Number(id)), eq(projectsTable.userId, userId))).run();
    return result.changes > 0;
  }

  /** ユーザーに紐づく指定 ID のプロジェクトを取得する。 */
  async findById(id: string, userId: string): Promise<ProjectEntity | null> {
    const row = await this.db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, Number(id)), eq(projectsTable.userId, userId)))
      .get();
    return row ? this.mapProject(row) : null;
  }

  /** ユーザー ID とプロジェクト名の組み合わせでプロジェクトを取得する。 */
  async findByName(userId: string, name: string): Promise<ProjectEntity | null> {
    const row = await this.db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.userId, userId), eq(projectsTable.name, name)))
      .get();
    return row ? this.mapProject(row) : null;
  }

  /** ユーザー配下の全プロジェクト一覧を取得する。 */
  async listByUser(userId: string): Promise<ProjectEntity[]> {
    const rows = await this.db.select().from(projectsTable).where(eq(projectsTable.userId, userId)).all();
    return rows.map(this.mapProject);
  }

  private mapProject = (row: ProjectRow): ProjectEntity => ({
    id: row.id.toString(),
    userId: row.userId,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
