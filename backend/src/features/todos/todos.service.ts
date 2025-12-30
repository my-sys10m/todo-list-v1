import { Inject, Injectable } from '@nestjs/common';
import { TodosRepository } from './todos.repository';

@Injectable()
export class TodosService {
  constructor(
    @Inject(TodosRepository)
    private readonly repository: TodosRepository,
  ) {}

  getHelloObject(): string {
    const sample = this.repository.getSample();
    return sample.objects;
  }

  getHelloMessage(): string {
    const object = this.getHelloObject();
    return `Hello ${object}!`;
  }
}
