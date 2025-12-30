import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';

export interface HttpApiProps {
  readonly allowedOrigins?: string[];
  readonly corsMethods?: apigwv2.CorsHttpMethod[];
  readonly corsHeaders?: string[];
}

// Thin wrapper for API Gateway HTTP API. Routes/authorizers/integrations are added by callers.
export class HttpApiGateway extends Construct {
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props?: HttpApiProps) {
    super(scope, id);

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      corsPreflight: props?.allowedOrigins
        ? {
            allowHeaders: props.corsHeaders ?? ['Authorization', 'Content-Type'],
            allowMethods:
              props.corsMethods ??
              [
                apigwv2.CorsHttpMethod.GET,
                apigwv2.CorsHttpMethod.POST,
                apigwv2.CorsHttpMethod.PATCH,
                apigwv2.CorsHttpMethod.DELETE,
              ],
            allowOrigins: props.allowedOrigins,
          }
        : undefined,
    });
  }
}
