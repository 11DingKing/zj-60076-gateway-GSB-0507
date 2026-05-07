import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestLogService } from './request-log.service';

@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  constructor(private requestLogService: RequestLogService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const adminPrefixes = ['/api', '/services', '/routes', '/rate-limit', '/auth', '/request-logs', '/circuit-breaker', '/health-check'];
    
    for (const prefix of adminPrefixes) {
      if (req.path.startsWith(prefix) || req.path === '/api' || req.path.startsWith('/api/')) {
        return next();
      }
    }

    const startTime = Date.now();
    const originalEnd = res.end.bind(res);
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let responseBody: any;

    const captureResponseBody = (body: any) => {
      try {
        if (typeof body === 'string') {
          responseBody = body;
        } else if (Buffer.isBuffer(body)) {
          responseBody = body.toString('utf8');
        } else {
          responseBody = body;
        }
      } catch (e) {
        responseBody = null;
      }
    };

    res.json = (body: any) => {
      captureResponseBody(body);
      return originalJson(body);
    };

    res.send = (body: any) => {
      captureResponseBody(body);
      return originalSend(body);
    };

    res.end = (chunk?: any, encoding?: any) => {
      captureResponseBody(chunk);
      return originalEnd(chunk, encoding);
    };

    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const ip = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] as string;

        const locals = res.locals || {};

        await this.requestLogService.create({
          path: req.path,
          method: req.method,
          ip,
          statusCode: res.statusCode,
          duration,
          serviceId: locals.serviceId,
          routeId: locals.routeId,
          userAgent,
          requestBody: this.sanitizeBody(req.body),
          responseBody: this.sanitizeBody(responseBody),
        });
      } catch (error) {
        console.error('Failed to log request:', error);
      }
    });

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

  private sanitizeBody(body: any): any {
    if (!body) {
      return null;
    }

    try {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      if (bodyStr.length > 10000) {
        return { truncated: true, size: bodyStr.length };
      }
      return body;
    } catch (e) {
      return null;
    }
  }
}
