import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ProjectsModule } from './features/projects/projects.module';
import { TodosModule } from './features/todos/todos.module';

@Module({
  imports: [DatabaseModule, TodosModule, ProjectsModule],
})
export class AppModule {}
