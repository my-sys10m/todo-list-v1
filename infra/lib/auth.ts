import { Construct } from 'constructs';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

export interface FirebaseJwtAuthorizerProps {
  readonly firebaseProjectId: string;
}

export class FirebaseJwtAuthorizer extends Construct {
  public readonly authorizer: authorizers.HttpJwtAuthorizer;

  constructor(scope: Construct, id: string, props: FirebaseJwtAuthorizerProps) {
    super(scope, id);

    const issuer = `https://securetoken.google.com/${props.firebaseProjectId}`;

    this.authorizer = new authorizers.HttpJwtAuthorizer('FirebaseJwtAuthorizer', issuer, {
      jwtAudience: [props.firebaseProjectId],
      identitySource: ['$request.header.Authorization'],
    });
  }
}
