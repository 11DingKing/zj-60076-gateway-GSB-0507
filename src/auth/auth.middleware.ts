import { Injectable, NestMiddleware, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { RoutesService } from '../routes/routes.service';
import { AuthType } from '@prisma/client';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private authService: AuthService,
    private routesService: RoutesService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const adminPrefixes = ['/api', '/services', '/routes', '/rate-limit', '/auth', '/request-logs', '/circuit-breaker', '/health-check'];
    
    for (const prefix of adminPrefixes) {
      if (req.path.startsWith(prefix) || req.path === '/api' || req.path.startsWith('/api/')) {
        return next();
      }
    }

    const matchedRoute = await this.routesService.matchRoute(req.path, req.method);

    if (!matchedRoute) {
      return next();
    }

    switch (matchedRoute.authType) {
      case AuthType.NONE:
        return next();

      case AuthType.JWT:
        await this.validateJwt(req);
        return next();

      case AuthType.API_KEY:
        await this.validateApiKey(req);
        return next();

      default:
        return next();
    }
  }

  private async validateJwt(req: Request): Promise<void> {
    const authorization = req.headers.authorization;
    const token = this.authService.extractTokenFromHeader(authorization);

    if (!token) {
      throw new UnauthorizedException('JWT token is required');
    }

    const user = await this.authService.validateJwtToken(token);
    (req as any).user = user;
  }

  private async validateApiKey(req: Request): Promise<void> {
    const apiKey = this.authService.extractApiKeyFromHeader(req.headers);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const keyInfo = await this.authService.validateApiKey(apiKey);
    (req as any).apiKey = keyInfo;
    (req as any).user = {
      userId: keyInfo.userId,
      username: keyInfo.name,
    };
  }
}
