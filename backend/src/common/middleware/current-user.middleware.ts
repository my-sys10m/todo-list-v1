import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { sub: string };
  }
}

/** API Gateway JWT の sub を req.user に転写するミドルウェア。 */
@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CurrentUserMiddleware.name);

  /** requestContext.authorizer から sub を抽出し、認証済みユーザーをリクエストに設定する。 */
  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : undefined;
    const decodedPayload = decodeJwtPayload(token);
    const payloadSub = typeof decodedPayload?.sub === 'string' ? decodedPayload.sub : undefined;
    let sub = payloadSub;
    const allowMock = process.env.ALLOW_MOCK_USER === 'true';
    // 明示的なフラグがあるときだけモックユーザーを付与する。
    if (!sub && allowMock) {
      sub = process.env.MOCK_USER_ID;
    }
    if (sub) {
      req.user = { sub };
    }
    next();
  }
}

const decodeJwtPayload = (token?: string): Record<string, unknown> | undefined => {
  if (!token) return undefined;
  const [, payload] = token.split('.');
  if (!payload) return undefined;
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  try {
    const json = Buffer.from(normalized, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return undefined;
  }
};
