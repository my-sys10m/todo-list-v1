import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it, beforeAll } from 'vitest';
import { DatabaseModule } from '../../database/database.module';
import { TodosController } from './todos.controller';
import { TodosModule } from './todos.module';
import { TodosService } from './todos.service';

describe('Todos hello endpoint', () => {
  let service: TodosService;
  let controller: TodosController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, TodosModule],
    }).compile();

    service = moduleRef.get(TodosService);
    controller = moduleRef.get(TodosController);
  });

  it('reads sample objects value from sqlite', () => {
    const objectValue = service.getHelloObject();
    expect(objectValue).toBe('todo');
  });

  it('builds Hello message with sample value', () => {
    const response = controller.hello();
    expect(response).toEqual({ message: 'Hello todo!' });
  });
});
