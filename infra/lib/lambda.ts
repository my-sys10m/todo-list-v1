import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface LambdaFunctionProps {
  readonly vpc: ec2.IVpc;
  readonly securityGroup: ec2.ISecurityGroup;
  readonly codePath: string;
  readonly handler: string;
  readonly environment?: Record<string, string>;
  readonly memorySize?: number;
  readonly timeoutSeconds?: number;
  readonly accessPoint?: efs.IAccessPoint;
  readonly mountPath?: string;
  readonly functionName?: string;
}

// Generic Lambda wrapper; EFS mount, envs, and time/memory are configurable.
export class LambdaFunction extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id);

    this.fn = new lambda.Function(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: props.handler,
      code: lambda.Code.fromAsset(props.codePath),
      functionName: props.functionName,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      memorySize: props.memorySize ?? 512,
      timeout: Duration.seconds(props.timeoutSeconds ?? 10),
      filesystem: props.accessPoint
        ? lambda.FileSystem.fromEfsAccessPoint(props.accessPoint, props.mountPath ?? '/mnt/efs')
        : undefined,
      environment: props.environment,
    });
  }
}
