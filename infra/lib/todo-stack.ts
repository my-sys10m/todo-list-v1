import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HttpApiGateway } from './api-gateway';
import { LambdaFunction } from './lambda';
import { AppVpc } from './vpc';
import { EfsFileSystem } from './efs';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as lambdaIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';

export interface TodoStackProps extends cdk.StackProps {
  readonly firebaseProjectId: string;
  readonly frontendOrigin: string;
  readonly sqlitePath: string;
  readonly lambdaCodePath: string;
  readonly lambdaHandler: string;
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

    const allowedOrigins = props.frontendOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    if (allowedOrigins.length === 0) {
      throw new Error('At least one frontend origin must be provided for CORS.');
    }

    const api = new HttpApiGateway(this, 'TodoHttpApi', {
      allowedOrigins,
    });

    const integration = new lambdaIntegrations.HttpLambdaIntegration(
      'TodoLambdaIntegration',
      todoFunction.fn,
    );

    api.httpApi.addRoutes({
      path: '/todos',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration,
      // TODO: re-enable Firebase JWT authorizer when hello endpoint testing is done
      // authorizer: authorizer.authorizer,
    });

    api.httpApi.addRoutes({
      path: '/todos/{id}',
      methods: [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE],
      integration,
      // authorizer: authorizer.authorizer,
    });

    api.httpApi.addRoutes({
      path: '/hello',
      methods: [apigwv2.HttpMethod.GET],
      integration,
      // authorizer: authorizer.authorizer,
    });

    new cdk.CfnOutput(this, 'HttpApiEndpoint', {
      value: api.httpApi.apiEndpoint,
      description: 'Invoke URL for the TODO HTTP API.',
    });
  }
}
