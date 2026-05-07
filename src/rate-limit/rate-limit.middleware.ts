import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitService, RateLimitResult } from './rate-limit.service';
import { RoutesService } from '../routes/routes.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(
    private rateLimitService: RateLimitService,
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

    const hasRateLimit =
      (matchedRoute.rateLimitQps !== null && matchedRoute.rateLimitQps !== undefined) ||
      (matchedRoute.ipRateLimitQps !== null && matchedRoute.ipRateLimitQps !== undefined) ||
      matchedRoute.tenantId !== null;

    if (!hasRateLimit) {
      return next();
    }

    const clientIp = this.getClientIp(req);

    const result: RateLimitResult = await this.rateLimitService.checkRateLimit(
      matchedRoute.id,
      matchedRoute.path,
      matchedRoute.rateLimitQps,
      matchedRoute.ipRateLimitQps,
      matchedRoute.tenantId,
      clientIp,
    );

    const resetSeconds = Math.ceil(result.resetMs / 1000);

    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);
    res.setHeader('X-RateLimit-Scope', result.scope || 'none');

    if (!result.allowed) {
      res.setHeader('Retry-After', resetSeconds || 1);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too Many Requests',
          error: 'Too Many Requests',
          scope: result.scope,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
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
}
