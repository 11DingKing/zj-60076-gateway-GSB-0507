import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { RateLimitService } from './rate-limit.service';

export type RateLimitScope = 'route' | 'tenant' | 'ip';

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  scope?: RateLimitScope;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const adminPrefixes = ['/api', '/services', '/routes', '/rate-limit', '/auth', '/request-logs', '/circuit-breaker', '/health-check'];
    
    for (const prefix of adminPrefixes) {
      if (request.path.startsWith(prefix) || request.path === '/api' || request.path.startsWith('/api/')) {
        return true;
      }
    }

    const ip = this.getClientIp(request);
    const tenantId = this.getTenantId(request);
    const routeId = this.getRouteId(request);

    const result = await this.rateLimitService.checkRateLimit({
      routeId,
      routePath: request.path,
      routeMethod: request.method,
      ip,
      tenantId,
    });

    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader('X-RateLimit-Reset', result.reset.toString());

    if (!result.allowed && result.scope) {
      response.setHeader('X-RateLimit-Scope', result.scope);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too Many Requests',
          error: 'Too Many Requests',
          retryAfter: Math.ceil(result.reset / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
        {
          cause: new Error('Rate limit exceeded'),
        },
      );
    }

    return true;
  }

  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return req.ip || '127.0.0.1';
  }

  private getTenantId(req: Request): string | undefined {
    const header = req.headers['x-tenant-id'];
    if (header) {
      return Array.isArray(header) ? header[0] : header;
    }
    const user = (req as any).user;
    if (user && (user.tenantId || user.sub)) {
      return user.tenantId || user.sub;
    }
    return undefined;
  }

  private getRouteId(req: Request): string | undefined {
    const matchedRoute = (req as any).matchedRoute;
    return matchedRoute?.id;
  }
}
