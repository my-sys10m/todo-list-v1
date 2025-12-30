import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { CreateProjectDto, ProjectListResponseDto, ProjectResponseDto, UpdateProjectDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const entity = await this.projectsRepository.insertProject({ userId, name: dto.name });
    return this.map(entity);
  }

  async update(userId: string, id: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    const updated = await this.projectsRepository.updateProject(id, userId, dto);
    if (!updated) throw new NotFoundException();
    return this.map(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const ok = await this.projectsRepository.softDelete(id, userId);
    if (!ok) throw new NotFoundException();
  }

  async listByUser(requestUserId: string, pathUserId?: string): Promise<ProjectListResponseDto> {
    if (pathUserId && pathUserId !== requestUserId) {
      throw new ForbiddenException();
    }
    const items = await this.projectsRepository.listByUser(requestUserId);
    return { items: items.map(this.map) };
  }

  private map = (entity: any): ProjectResponseDto => ({
    id: entity.id,
    userId: entity.userId,
    name: entity.name,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}
