import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ProjectsModule } from './features/projects/projects.module';
import { TodosModule } from './features/todos/todos.module';
import { CurrentUserMiddleware } from './common/middleware/current-user.middleware';
import { ProjectsController } from './features/projects/projects.controller';
import { TodosController } from './features/todos/todos.controller';

/** アプリケーションのルートモジュール。 */
@Module({
  imports: [DatabaseModule, TodosModule, ProjectsModule],
})
export class AppModule implements NestModule {
  /** 認証済みユーザー情報を API ルートに付与するミドルウェアを登録する。 */
  configure(consumer: MiddlewareConsumer) {
    console.log(consumer)
    consumer.apply(CurrentUserMiddleware).forRoutes(ProjectsController, TodosController);
  }
}
