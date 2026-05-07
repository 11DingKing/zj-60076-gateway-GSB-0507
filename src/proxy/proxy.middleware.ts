import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProxyService } from './proxy.service';

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  constructor(private proxyService: ProxyService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const adminPrefixes = ['/api', '/services', '/routes', '/rate-limit', '/auth', '/request-logs', '/circuit-breaker', '/health-check'];
    
    for (const prefix of adminPrefixes) {
      if (req.path.startsWith(prefix) || req.path === '/api' || req.path.startsWith('/api/')) {
        return next();
      }
    }

    try {
      await this.proxyService.proxy(req, res);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json({
          statusCode: error.getStatus(),
          message: error.message,
          error: HttpStatus[error.getStatus()],
        });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal Server Error',
          error: 'Internal Server Error',
        });
      }
    }
  }
}
