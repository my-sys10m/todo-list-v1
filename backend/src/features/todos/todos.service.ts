import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTodoDto, SearchTodoQueryDto, TodoListResponseDto, TodoResponseDto, UpdateTodoDto } from './todos.dto';
import { TodoEntity, TodosRepository } from './todos.repository';
import { ProjectsRepository } from '../projects/projects.repository';

/** TODO のユースケースを司るサービス層。 */
@Injectable()
export class TodosService {
  constructor(private readonly repository: TodosRepository, private readonly projectsRepository: ProjectsRepository) {}

  /** プロジェクト存在を確認した上で TODO を作成する。 */
  async create(userId: string, dto: CreateTodoDto): Promise<TodoResponseDto> {
    const project = await this.projectsRepository.findById(dto.projectId, userId);
    if (!project) throw new NotFoundException('project not found');
    const entity = await this.repository.insertTodo({ ...dto, userId });
    return this.map(entity);
  }

  /** ユーザー所有の TODO を取得する。 */
  async findOne(userId: string, id: string): Promise<TodoResponseDto> {
    const todo = await this.repository.findById(id, userId);
    if (!todo) throw new NotFoundException();
    return this.map(todo);
  }

  /** ユーザーの TODO 一覧を取得する。 */
  async findAll(userId: string, date?: string): Promise<TodoListResponseDto> {
    const items = await this.repository.queryByUser(userId, date);
    return { items: items.map(this.map) };
  }

  /** フィルタ条件で TODO を検索する。最大 50 件まで返却し、それを超える場合はエラーとする。 */
  async search(userId: string, query: SearchTodoQueryDto): Promise<TodoListResponseDto> {
    const createdFrom = appendMicroSec(query.createdFrom);
    const createdTo = appendMicroSec(query.createdTo);
    const updatedFrom = appendMicroSec(query.updatedFrom);
    const updatedTo = appendMicroSec(query.updatedTo);
    const items = await this.repository.search(
      userId,
      {
        title: query.title,
        status: query.status,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
      },
      51,
    );
    if (items.length > 50) {
      throw new BadRequestException('Too many results. Please narrow your search conditions.');
    }
    return { items: items.map(this.map) };
  }

  /** TODO を部分更新する。 */
  async update(userId: string, id: string, dto: UpdateTodoDto): Promise<TodoResponseDto> {
    const updated = await this.repository.updateById(id, userId, dto);
    if (!updated) throw new NotFoundException();
    return this.map(updated);
  }

  /** TODO を論理削除する。 */
  async remove(userId: string, id: string): Promise<void> {
    const ok = await this.repository.softDelete(id, userId);
    if (!ok) throw new NotFoundException();
  }

  private map = (entity: TodoEntity): TodoResponseDto => ({
    id: entity.id,
    projectId: entity.projectId,
    userId: entity.userId,
    title: entity.title,
    status: entity.status,
    isDeleted: entity.isDeleted,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

const appendMicroSec = (date?: string): string | undefined => {
  if (!date) return undefined;
  return `${date}T00:00:00.000Z`;
};
