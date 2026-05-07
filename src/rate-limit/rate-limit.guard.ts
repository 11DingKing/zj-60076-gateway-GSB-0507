import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { Route } from '@prisma/client';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const route: Route | undefined = request.matchedRoute;

    if (!route) {
      return true;
    }

    const hasRateLimit =
      (route.rateLimitQps !== null && route.rateLimitQps !== undefined) ||
      (route.ipRateLimitQps !== null && route.ipRateLimitQps !== undefined) ||
      route.tenantId !== null;

    if (!hasRateLimit) {
      return true;
    }

    const clientIp = this.getClientIp(request);
    const result = await this.rateLimitService.checkRateLimit(
      route.id,
      route.path,
      route.rateLimitQps,
      route.ipRateLimitQps,
      route.tenantId,
      clientIp,
    );

    const response = context.switchToHttp().getResponse();
    const resetSeconds = Math.ceil(result.resetMs / 1000);

    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', resetSeconds);
    response.setHeader('X-RateLimit-Scope', result.scope || 'none');

    if (!result.allowed) {
      response.setHeader('Retry-After', resetSeconds || 1);
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

    return true;
  }

  private getClientIp(req: any): string {
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
