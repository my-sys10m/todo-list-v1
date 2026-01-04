import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTodoDto, SearchTodoQueryDto, TodoListResponseDto, TodoResponseDto, UpdateTodoDto } from './todos.dto';
import { TodosService } from './todos.service';

/** TODO API を公開するコントローラ。 */
@ApiTags('todos')
@ApiBearerAuth()
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  /** TODO を新規登録するエンドポイント。 */
  @Post()
  @ApiOperation({ summary: 'Create Todo' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  create(@Req() req: any, @Body() dto: CreateTodoDto) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.create(userId, dto);
  }

  /** フィルタ条件で TODO を検索するエンドポイント。 */
  @Get('search')
  @ApiOperation({ summary: 'Search Todos' })
  @ApiOkResponse({ type: TodoListResponseDto })
  @ApiBadRequestResponse({ description: 'Too many results' })
  search(@Req() req: any, @Query() query: SearchTodoQueryDto) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.search(userId, query);
  }

  /** TODO を単一取得するエンドポイント。 */
  @Get(':id')
  @ApiOperation({ summary: 'Get Todo' })
  @ApiOkResponse({ type: TodoResponseDto })
  findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.findOne(userId, id);
  }

  /** TODO の一覧を取得するエンドポイント。 */
  @Get()
  @ApiOperation({ summary: 'List Todos by user/date' })
  @ApiOkResponse({ type: TodoListResponseDto })
  findAll(@Req() req: any, @Query('date') date?: string) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.findAll(userId, date);
  }

  /** TODO を部分更新するエンドポイント。 */
  @Patch(':id')
  @ApiOperation({ summary: 'Update Todo' })
  @ApiOkResponse({ type: TodoResponseDto })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTodoDto) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.update(userId, id, dto);
  }

  /** TODO を論理削除するエンドポイント。 */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete Todo' })
  @ApiNoContentResponse()
  remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();
    return this.todosService.remove(userId, id);
  }
}
