import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';

export interface EfsProps {
  readonly vpc: ec2.IVpc;
  readonly securityGroup: ec2.ISecurityGroup;
}

// EFS FileSystem only. Access points and connections are defined by callers.
export class EfsFileSystem extends Construct {
  public readonly fileSystem: efs.FileSystem;

  constructor(scope: Construct, id: string, props: EfsProps) {
    super(scope, id);

    this.fileSystem = new efs.FileSystem(this, 'FileSystem', {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      removalPolicy: RemovalPolicy.RETAIN,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      // Automatic backups off for simplicity in this sample stack
      enableAutomaticBackups: false,
    });
  }
}
