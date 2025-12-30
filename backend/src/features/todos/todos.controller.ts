import { Controller, Get, Inject } from '@nestjs/common';
import { TodosService } from './todos.service';
import { HelloResponseDto } from './todos.dto';

@Controller('todos')
export class TodosController {
  constructor(
    @Inject(TodosService)
    private readonly todosService: TodosService,
  ) {}

  @Get('hello')
  hello(): HelloResponseDto {
    const message = this.todosService.getHelloMessage();
    return { message };
  }
}
