import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private rateLimitService: RateLimitService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const adminPrefixes = ['/api', '/services', '/routes', '/rate-limit', '/auth', '/request-logs', '/circuit-breaker', '/health-check'];
    
    for (const prefix of adminPrefixes) {
      if (req.path.startsWith(prefix) || req.path === '/api' || req.path.startsWith('/api/')) {
        return next();
      }
    }

    const matchedRule = await this.rateLimitService.matchRule(req.path, req.method);

    if (!matchedRule) {
      return next();
    }

    const ip = this.getClientIp(req);
    const userId = (req as any).user?.id;

    const result = await this.rateLimitService.isAllowed(matchedRule, ip, userId);

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too Many Requests',
          error: 'Too Many Requests',
          retryAfter: result.retryAfter || 1,
        },
        HttpStatus.TOO_MANY_REQUESTS,
        {
          cause: new Error('Rate limit exceeded'),
        },
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
