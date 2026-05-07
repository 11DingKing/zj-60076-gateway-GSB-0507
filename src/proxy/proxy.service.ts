import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RoutesService } from '../routes/routes.service';
import { LoadBalanceService } from '../load-balance/load-balance.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { RateLimitService, RateLimitResult } from '../rate-limit/rate-limit.service';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import { Route, Service, AuthType } from '@prisma/client';

interface GrayRule {
  type: 'header' | 'percentage' | 'ip_whitelist';
  headerName?: string;
  headerModulo?: number;
  headerThreshold?: number;
  percentage?: number;
  ipWhitelist?: string[];
}

@Injectable()
export class ProxyService {
  constructor(
    private routesService: RoutesService,
    private loadBalanceService: LoadBalanceService,
    private circuitBreakerService: CircuitBreakerService,
    private rateLimitService: RateLimitService,
  ) {}

  async proxy(request: Request, response: Response): Promise<void> {
    const { method, path, headers, body } = request;

    const matchedRoute = await this.routesService.matchRoute(path, method);

    if (!matchedRoute) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const { service } = matchedRoute;

    if (!service.enabled) {
      throw new HttpException('Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const clientIp = this.getClientIp(request);
    await this.enforceRateLimit(matchedRoute, clientIp, response);

    const isCircuitOpen = await this.circuitBreakerService.isCircuitOpen(service.id);
    if (isCircuitOpen) {
      throw new HttpException('Service Unavailable (Circuit Breaker)', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const useGrayUpstream = this.shouldUseGrayUpstream(matchedRoute, request, clientIp);

    let targetUrl: string | null;
    if (useGrayUpstream && matchedRoute.grayUpstream) {
      targetUrl = matchedRoute.grayUpstream;
    } else {
      targetUrl = await this.loadBalanceService.getNextInstance(service.id);
    }

    if (!targetUrl) {
      throw new HttpException('No healthy instances available', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const rewrittenPath = this.routesService.rewritePath(
      path,
      matchedRoute.path,
      matchedRoute.rewritePath,
    );

    const fullTargetUrl = this.buildTargetUrl(targetUrl, rewrittenPath);

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: method.toLowerCase() as any,
        url: fullTargetUrl,
        headers: this.prepareHeaders(headers, matchedRoute.extraHeaders as Record<string, string>),
        data: body,
        timeout: service.timeout,
        validateStatus: () => true,
        responseType: 'stream',
      };

      const startTime = Date.now();
      const axiosResponse = await axios(axiosConfig);
      const duration = Date.now() - startTime;

      if (!useGrayUpstream) {
        await this.circuitBreakerService.recordSuccess(service.id);
      }

      response.status(axiosResponse.status);
      this.copyResponseHeaders(axiosResponse, response);

      axiosResponse.data.pipe(response);

      response.locals = {
        ...response.locals,
        serviceId: service.id,
        routeId: matchedRoute.id,
        statusCode: axiosResponse.status,
        duration,
        grayRouted: useGrayUpstream,
      };
    } catch (error) {
      if (!useGrayUpstream) {
        await this.circuitBreakerService.recordFailure(service.id);
      }

      const errorCode = (error as any).code;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorCode === 'ECONNABORTED') {
        throw new HttpException('Gateway Timeout', HttpStatus.GATEWAY_TIMEOUT);
      }

      throw new HttpException(
        'Bad Gateway: ' + errorMessage,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async enforceRateLimit(
    route: Route,
    clientIp: string,
    response: Response,
  ): Promise<void> {
    const hasRateLimit =
      (route.rateLimitQps !== null && route.rateLimitQps !== undefined) ||
      (route.ipRateLimitQps !== null && route.ipRateLimitQps !== undefined) ||
      route.tenantId !== null;

    if (!hasRateLimit) {
      return;
    }

    const result: RateLimitResult = await this.rateLimitService.checkRateLimit(
      route.id,
      route.path,
      route.rateLimitQps,
      route.ipRateLimitQps,
      route.tenantId,
      clientIp,
    );

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
  }

  private shouldUseGrayUpstream(route: Route, request: Request, clientIp: string): boolean {
    if (!route.grayRules || !route.grayUpstream) {
      return false;
    }

    let grayRules: GrayRule[];
    try {
      grayRules = Array.isArray(route.grayRules) ? (route.grayRules as unknown as GrayRule[]) : [route.grayRules as unknown as GrayRule];
    } catch {
      return false;
    }

    for (const rule of grayRules) {
      switch (rule.type) {
        case 'header':
          if (this.matchHeaderRule(rule, request)) {
            return true;
          }
          break;
        case 'percentage':
          if (this.matchPercentageRule(rule)) {
            return true;
          }
          break;
        case 'ip_whitelist':
          if (this.matchIpWhitelistRule(rule, clientIp)) {
            return true;
          }
          break;
      }
    }

    return false;
  }

  private matchHeaderRule(rule: GrayRule, request: Request): boolean {
    if (!rule.headerName) return false;

    const headerValue = request.headers[rule.headerName.toLowerCase()];
    if (!headerValue) return false;

    if (rule.headerModulo !== undefined && rule.headerThreshold !== undefined) {
      const numericPart = parseInt(String(headerValue).replace(/\D/g, ''), 10);
      if (isNaN(numericPart)) return false;
      return numericPart % rule.headerModulo < rule.headerThreshold;
    }

    return true;
  }

  private matchPercentageRule(rule: GrayRule): boolean {
    if (rule.percentage === undefined) return false;
    return Math.random() * 100 < rule.percentage;
  }

  private matchIpWhitelistRule(rule: GrayRule, clientIp: string): boolean {
    if (!rule.ipWhitelist || rule.ipWhitelist.length === 0) return false;
    return rule.ipWhitelist.includes(clientIp);
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || '127.0.0.1';
  }

  private buildTargetUrl(baseUrl: string, path: string): string {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return cleanBaseUrl + cleanPath;
  }

  private prepareHeaders(
    originalHeaders: Record<string, any>,
    extraHeaders?: Record<string, string>,
  ): Record<string, any> {
    const headers = { ...originalHeaders };

    delete headers['host'];
    delete headers['content-length'];
    delete headers['connection'];

    if (extraHeaders) {
      Object.entries(extraHeaders).forEach(([key, value]) => {
        headers[key.toLowerCase()] = value;
      });
    }

    return headers;
  }

  private copyResponseHeaders(axiosResponse: AxiosResponse, response: Response): void {
    const headersToSkip = ['content-length', 'transfer-encoding', 'connection', 'keep-alive'];

    Object.entries(axiosResponse.headers).forEach(([key, value]) => {
      if (!headersToSkip.includes(key.toLowerCase()) && value) {
        response.setHeader(key, value);
      }
    });
  }
}
