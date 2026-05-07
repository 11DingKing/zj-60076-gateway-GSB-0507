import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private rateLimitService: RateLimitService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const adminPrefixes = ['/services', '/routes', '/rate-limit', '/auth', '/request-logs', '/circuit-breaker', '/health-check'];

    if (req.path === '/api/docs' || req.path.startsWith('/api/docs/')) {
      return next();
    }

    for (const prefix of adminPrefixes) {
      if (req.path === prefix || req.path.startsWith(prefix + '/')) {
        return next();
      }
    }

    const ip = this.getClientIp(req);
    const tenantId = this.getTenantId(req);

    const result = await this.rateLimitService.checkRateLimit({
      routePath: req.path,
      routeMethod: req.method,
      ip,
      tenantId,
    });

    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.reset.toString());

    if (!result.allowed && result.scope) {
      res.setHeader('X-RateLimit-Scope', result.scope);
      res.status(429).json({
        statusCode: 429,
        message: 'Too Many Requests',
        error: 'Too Many Requests',
        retryAfter: Math.ceil(result.reset / 1000),
      });
      return;
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

  private getTenantId(req: Request): string | undefined {
    const header = req.headers['x-tenant-id'];
    if (header) {
      return Array.isArray(header) ? header[0] : header;
    }
    const user = (req as any).user;
    if (user && (user.tenantId || user.sub || user.userId)) {
      return user.tenantId || user.sub || user.userId;
    }
    return undefined;
  }
}
