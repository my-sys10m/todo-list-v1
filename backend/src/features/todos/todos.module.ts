import { Module, forwardRef } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { TodosController } from './todos.controller';
import { TodosRepository } from './todos.repository';
import { TodosService } from './todos.service';

/** TODO 機能の NestJS モジュール。 */
@Module({
  imports: [forwardRef(() => ProjectsModule)],
  controllers: [TodosController],
  providers: [TodosService, TodosRepository],
})
export class TodosModule {}
