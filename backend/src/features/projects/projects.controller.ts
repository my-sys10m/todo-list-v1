import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProjectDto, ProjectListResponseDto, ProjectResponseDto, UpdateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post('projects')
  @ApiOperation({ summary: 'Create Project' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.projectsService.create(userId, dto);
  }

  @Patch('projects/:id')
  @ApiOperation({ summary: 'Update Project' })
  @ApiOkResponse({ type: ProjectResponseDto })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.projectsService.update(userId, id, dto);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Delete Project' })
  @ApiNoContentResponse()
  remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.projectsService.remove(userId, id);
  }

  @Get('users/projects')
  @ApiOperation({ summary: 'List projects for current user' })
  @ApiOkResponse({ type: ProjectListResponseDto })
  listByUser(@Req() req: any) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.projectsService.listByUser(userId);
  }
}
