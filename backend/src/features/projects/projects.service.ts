import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectEntity, ProjectsRepository } from './projects.repository';
import { CreateProjectDto, ProjectListResponseDto, ProjectResponseDto, UpdateProjectDto } from './projects.dto';

/** プロジェクトのユースケースを実装するサービス層。 */
@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  /** プロジェクトを作成しレスポンス DTO に整形する。 */
  async create(userId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const existing = await this.projectsRepository.findByName(userId, dto.name);
    if (existing) throw new ConflictException('project already exists');
    const entity = await this.projectsRepository.insertProject({
      userId,
      name: dto.name,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });
    return this.map(entity);
  }

  /** プロジェクトを部分更新する。 */
  async update(userId: string, id: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    const updated = await this.projectsRepository.updateProject(id, userId, dto);
    if (!updated) throw new NotFoundException();
    return this.map(updated);
  }

  /** プロジェクトを削除する。 */
  async remove(userId: string, id: string): Promise<void> {
    const ok = await this.projectsRepository.softDelete(id, userId);
    if (!ok) throw new NotFoundException();
  }

  /** ユーザー配下のプロジェクト一覧を取得する。 */
  async listByUser(requestUserId: string, pathUserId?: string): Promise<ProjectListResponseDto> {
    if (pathUserId && pathUserId !== requestUserId) {
      throw new ForbiddenException();
    }
    const items = await this.projectsRepository.listByUser(requestUserId);
    return { items: items.map(this.map) };
  }

  private map = (entity: ProjectEntity): ProjectResponseDto => ({
    id: entity.id,
    userId: entity.userId,
    name: entity.name,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}
