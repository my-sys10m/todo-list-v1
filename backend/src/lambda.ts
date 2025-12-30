import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import type { Handler, Context, Callback, APIGatewayProxyEventV2 } from 'aws-lambda';
import { AppModule } from './app.module';

type LambdaHandler = Handler<APIGatewayProxyEventV2>;

let cachedServer: LambdaHandler | undefined;

async function bootstrapServer(): Promise<LambdaHandler> {
  const expressApp = express();
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  await nestApp.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: LambdaHandler = async (
  event: APIGatewayProxyEventV2,
  context: Context,
  callback: Callback,
) => {
  context.callbackWaitsForEmptyEventLoop = false;
  cachedServer = cachedServer ?? (await bootstrapServer());
  return cachedServer(event, context, callback);
};
