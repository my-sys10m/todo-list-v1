import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTodoDto, TodoListResponseDto, TodoResponseDto, UpdateTodoDto } from './todos.dto';
import { TodosRepository } from './todos.repository';
import { ProjectsRepository } from '../projects/projects.repository';

@Injectable()
export class TodosService {
  constructor(private readonly repository: TodosRepository, private readonly projectsRepository: ProjectsRepository) {}

  async create(userId: string, dto: CreateTodoDto): Promise<TodoResponseDto> {
    const project = await this.projectsRepository.findById(dto.projectId, userId);
    if (!project) throw new NotFoundException('project not found');
    const entity = await this.repository.insertTodo({ ...dto, userId });
    return this.map(entity);
  }

  async findOne(userId: string, id: string): Promise<TodoResponseDto> {
    const todo = await this.repository.findById(id, userId);
    if (!todo) throw new NotFoundException();
    return this.map(todo);
  }

  async findAll(userId: string, date?: string): Promise<TodoListResponseDto> {
    const items = await this.repository.queryByUser(userId, date);
    return { items: items.map(this.map) };
  }

  async update(userId: string, id: string, dto: UpdateTodoDto): Promise<TodoResponseDto> {
    const updated = await this.repository.updateById(id, userId, dto);
    if (!updated) throw new NotFoundException();
    return this.map(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const ok = await this.repository.softDelete(id, userId);
    if (!ok) throw new NotFoundException();
  }

  private map = (entity: any): TodoResponseDto => ({
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
