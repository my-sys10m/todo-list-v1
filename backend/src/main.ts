import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());

  // CORSの設定
  const allowedOrigins =
    process.env.FRONTEND_ORIGIN?.split(',').map((o) => o.trim()).filter((o) => o.length > 0) ?? [
      'http://localhost:5173',
      'https://todo-list-v0-4a7a2.web.app',
    ];
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // ValidationPipeの設定
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swaggerの設定
  setupSwagger(app);

  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3000;
  await app.listen(port);
}

bootstrap().catch((err) => {
  // NestFactory.create などで例外が出た場合にプロセスを落とす
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap application', err);
  process.exit(1);
});
