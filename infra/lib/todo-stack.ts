import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HttpApiGateway } from './api-gateway';
import { LambdaFunction } from './lambda';
import { AppVpc } from './vpc';
import { EfsFileSystem } from './efs';
import { FirebaseJwtAuthorizer } from './auth';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as lambdaIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';

export interface TodoStackProps extends cdk.StackProps {
  readonly firebaseProjectId: string;
  readonly frontendOrigin: string;
  readonly sqlitePath: string;
  readonly lambdaCodePath: string;
  readonly lambdaHandler: string;
  readonly migrationHandler?: string;
  readonly migrationFunctionName?: string;
}

export class TodoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TodoStackProps) {
    super(scope, id, props);

    const vpc = new AppVpc(this, 'Vpc');

    const efsFs = new EfsFileSystem(this, 'Efs', {
      vpc: vpc.vpc,
      securityGroup: vpc.efsSecurityGroup,
    });

    const accessPoint = efsFs.fileSystem.addAccessPoint('SqliteAccessPoint', {
      path: '/sqlite',
      createAcl: { ownerUid: '1000', ownerGid: '1000', permissions: '750' },
      posixUser: { uid: '1000', gid: '1000' },
    });

    efsFs.fileSystem.connections.allowDefaultPortFrom(
      vpc.lambdaSecurityGroup,
      'Allow NFS from Lambda to EFS',
    );

    const todoFunction = new LambdaFunction(this, 'TodoLambda', {
      vpc: vpc.vpc,
      securityGroup: vpc.lambdaSecurityGroup,
      accessPoint,
      codePath: props.lambdaCodePath,
      handler: props.lambdaHandler,
      mountPath: '/mnt/efs',
      environment: {
        FIREBASE_PROJECT_ID: props.firebaseProjectId,
        SQLITE_PATH: props.sqlitePath,
      },
    });

    const migrationFunction = new LambdaFunction(this, 'MigrationLambda', {
      vpc: vpc.vpc,
      securityGroup: vpc.lambdaSecurityGroup,
      accessPoint,
      codePath: props.lambdaCodePath,
      handler: props.migrationHandler ?? 'dist/migration.handler',
      functionName: props.migrationFunctionName ?? 'todo-migration',
      mountPath: '/mnt/efs',
      timeoutSeconds: 30,
      environment: {
        SQLITE_PATH: props.sqlitePath,
        MIGRATION_SOURCE_DIR: '/var/task/db/drizzle',
        MIGRATION_HISTORY_PATH: '/tmp/db/migration/migration_history.csv',
      },
    });

    const allowedOrigins = props.frontendOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    if (allowedOrigins.length === 0) {
      throw new Error('At least one frontend origin must be provided for CORS.');
    }

    const api = new HttpApiGateway(this, 'TodoHttpApi', {
      allowedOrigins,
      corsHeaders: ['Authorization', 'Content-Type', 'Accept'],
      corsMethods: [
        apigwv2.CorsHttpMethod.GET,
        apigwv2.CorsHttpMethod.POST,
        apigwv2.CorsHttpMethod.PUT,
        apigwv2.CorsHttpMethod.PATCH,
        apigwv2.CorsHttpMethod.DELETE,
        apigwv2.CorsHttpMethod.OPTIONS,
      ],
    });

    const authorizer = new FirebaseJwtAuthorizer(this, 'FirebaseJwtAuthorizer', {
      firebaseProjectId: props.firebaseProjectId,
    });

    const integration = new lambdaIntegrations.HttpLambdaIntegration(
      'TodoLambdaIntegration',
      todoFunction.fn,
    );

    api.httpApi.addRoutes({
      path: '/todos',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration,
      authorizer: authorizer.authorizer,
    });

    api.httpApi.addRoutes({
      path: '/todos/search',
      methods: [apigwv2.HttpMethod.GET],
      integration,
      authorizer: authorizer.authorizer,
    });

    api.httpApi.addRoutes({
      path: '/todos/{id}',
      methods: [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE],
      integration,
      authorizer: authorizer.authorizer,
    });

    api.httpApi.addRoutes({
      path: '/projects',
      methods: [apigwv2.HttpMethod.POST],
      integration,
      authorizer: authorizer.authorizer,
    });

    api.httpApi.addRoutes({
      path: '/projects/{id}',
      methods: [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE],
      integration,
      authorizer: authorizer.authorizer,
    });

    api.httpApi.addRoutes({
      path: '/users/projects',
      methods: [apigwv2.HttpMethod.GET],
      integration,
      authorizer: authorizer.authorizer,
    });

    api.httpApi.addRoutes({
      path: '/hello',
      methods: [apigwv2.HttpMethod.GET],
      integration,
      authorizer: authorizer.authorizer,
    });

    new cdk.CfnOutput(this, 'HttpApiEndpoint', {
      value: api.httpApi.apiEndpoint,
      description: 'Invoke URL for the TODO HTTP API.',
    });

    new cdk.CfnOutput(this, 'MigrationFunctionName', {
      value: migrationFunction.fn.functionName,
      description: 'Lambda function name for running database migrations.',
    });
  }
}
