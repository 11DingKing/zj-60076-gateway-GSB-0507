import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RoutesService } from '../routes/routes.service';
import { LoadBalanceService } from '../load-balance/load-balance.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import { Route, Service, AuthType } from '@prisma/client';

@Injectable()
export class ProxyService {
  constructor(
    private routesService: RoutesService,
    private loadBalanceService: LoadBalanceService,
    private circuitBreakerService: CircuitBreakerService,
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

    const isCircuitOpen = await this.circuitBreakerService.isCircuitOpen(service.id);
    if (isCircuitOpen) {
      throw new HttpException('Service Unavailable (Circuit Breaker)', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const targetUrl = await this.loadBalanceService.getNextInstance(service.id);

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

      await this.circuitBreakerService.recordSuccess(service.id);

      response.status(axiosResponse.status);
      this.copyResponseHeaders(axiosResponse, response);

      axiosResponse.data.pipe(response);

      response.locals = {
        ...response.locals,
        serviceId: service.id,
        routeId: matchedRoute.id,
        statusCode: axiosResponse.status,
        duration,
      };
    } catch (error) {
      await this.circuitBreakerService.recordFailure(service.id);

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
