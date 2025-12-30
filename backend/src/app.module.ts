import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { TodosModule } from './features/todos/todos.module';

@Module({
  imports: [DatabaseModule, TodosModule],
})
export class AppModule {}
