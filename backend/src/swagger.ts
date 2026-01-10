import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const swaggerSetupPath = 'api/docs';

/** Swagger ドキュメントを生成する。 */
export const createSwaggerDocument = (app: INestApplication) => {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Todo API')
    .setDescription('Todo/Project API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, swaggerConfig);
};

/** Swagger UI のルートを有効化する。 */
export const setupSwagger = (app: INestApplication) => {
  const document = createSwaggerDocument(app);
  SwaggerModule.setup(swaggerSetupPath, app, document);
  return document;
};

/** Swagger UI のベースパス。 */
export const getSwaggerPath = () => swaggerSetupPath;
