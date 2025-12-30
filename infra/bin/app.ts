import * as cdk from 'aws-cdk-lib';
import { TodoStack } from '../lib/todo-stack';

const app = new cdk.App();

// For temporary hello-endpoint testing, default to dummy values when not provided.
const firebaseProjectId =
  app.node.tryGetContext('firebaseProjectId') ??
  process.env.FIREBASE_PROJECT_ID ??
  'dummy-firebase-project';
const frontendOrigin =
  app.node.tryGetContext('frontendOrigin') ?? process.env.FRONTEND_ORIGIN ?? 'http://localhost';

// Prefer explicit env when available; otherwise fall back to CDK default resolution.
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID,
  region:
    process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,
};

const stackEnv = env.account && env.region ? env : undefined;

const stack = new TodoStack(app, 'TodoStack', {
  firebaseProjectId,
  frontendOrigin,
  sqlitePath:
    app.node.tryGetContext('sqlitePath') ?? process.env.SQLITE_PATH ?? '/mnt/efs/todo.db',
  lambdaCodePath:
    app.node.tryGetContext('lambdaCodePath') ??
    process.env.LAMBDA_CODE_PATH ??
    '../backend/deploy',
  lambdaHandler:
    app.node.tryGetContext('lambdaHandler') ?? process.env.LAMBDA_HANDLER ?? 'dist/lambda.handler',
  stackName: app.node.tryGetContext('stackName'),
  env: stackEnv,
});

cdk.Tags.of(stack).add('app', 'todo');
