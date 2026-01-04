import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProjectDto, ProjectListResponseDto, ProjectResponseDto, UpdateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';

/** プロジェクト API を公開するコントローラ。 */
@ApiTags('projects')
@ApiBearerAuth()
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** プロジェクトを新規作成するエンドポイント。 */
  @Post('projects')
  @ApiOperation({ summary: 'Create Project' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @ApiConflictResponse()
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    console.log('ProjectsController.create called');
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.projectsService.create(userId, dto);
  }

  /** プロジェクトを部分更新するエンドポイント。 */
  @Patch('projects/:id')
  @ApiOperation({ summary: 'Update Project' })
  @ApiOkResponse({ type: ProjectResponseDto })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.projectsService.update(userId, id, dto);
  }

  /** プロジェクトを削除するエンドポイント。 */
  @Delete('projects/:id')
  @ApiOperation({ summary: 'Delete Project' })
  @ApiNoContentResponse()
  remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.projectsService.remove(userId, id);
  }

  /** ログインユーザーのプロジェクト一覧を取得するエンドポイント。 */
  @Get('users/projects')
  @ApiOperation({ summary: 'List projects for current user' })
  @ApiOkResponse({ type: ProjectListResponseDto })
  listByUser(@Req() req: any) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.projectsService.listByUser(userId);
  }
}
