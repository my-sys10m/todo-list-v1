import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Todo API')
    .setDescription('Todo/Project API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3000;
  await app.listen(port);
}

bootstrap();
