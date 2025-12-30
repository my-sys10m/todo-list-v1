import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTodoDto, TodoListResponseDto, TodoResponseDto, UpdateTodoDto } from './todos.dto';
import { TodosService } from './todos.service';

@ApiTags('todos')
@ApiBearerAuth()
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  @ApiOperation({ summary: 'Create Todo' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  create(@Req() req: any, @Body() dto: CreateTodoDto) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Todo' })
  @ApiOkResponse({ type: TodoResponseDto })
  findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.findOne(userId, id);
  }

  @Get()
  @ApiOperation({ summary: 'List Todos by user/date' })
  @ApiOkResponse({ type: TodoListResponseDto })
  findAll(@Req() req: any, @Query('date') date?: string) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.findAll(userId, date);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update Todo' })
  @ApiOkResponse({ type: TodoResponseDto })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTodoDto) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Todo' })
  @ApiNoContentResponse()
  remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.remove(userId, id);
  }
}
