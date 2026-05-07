import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAllServices() {
    this.logger.debug('Starting health check for all services...');

    const services = await this.prisma.service.findMany({
      where: {
        enabled: true,
      },
      include: {
        instances: true,
      },
    });

    for (const service of services) {
      for (const instance of service.instances) {
        const isHealthy = await this.checkInstanceHealth(
          instance.url,
          service.healthCheckPath,
          service.timeout,
        );

        await this.prisma.serviceInstance.update({
          where: { id: instance.id },
          data: {
            healthy: isHealthy,
            lastCheck: new Date(),
            updatedAt: new Date(),
          },
        });

        if (isHealthy !== instance.healthy) {
          this.logger.log(
            `Instance ${instance.url} for service ${service.name} changed from ${instance.healthy} to ${isHealthy}`,
          );
        }
      }
    }

    this.logger.debug('Health check completed');
  }

  private async checkInstanceHealth(
    baseUrl: string,
    healthCheckPath: string,
    timeout: number,
  ): Promise<boolean> {
    try {
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const cleanPath = healthCheckPath.startsWith('/')
        ? healthCheckPath
        : '/' + healthCheckPath;
      const healthUrl = cleanBaseUrl + cleanPath;

      const response = await axios.get(healthUrl, {
        timeout,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Health check failed for ${baseUrl}${healthCheckPath}: ${message}`,
      );
      return false;
    }
  }

  async triggerManualCheck(): Promise<void> {
    await this.checkAllServices();
  }

  async getServiceHealth(serviceId: string): Promise<{
    service: any;
    instances: any[];
    healthyCount: number;
    totalCount: number;
  }> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        instances: true,
      },
    });

    if (!service) {
      throw new Error(`Service with id ${serviceId} not found`);
    }

    const healthyCount = service.instances.filter((i) => i.healthy).length;
    const totalCount = service.instances.length;

    return {
      service,
      instances: service.instances,
      healthyCount,
      totalCount,
    };
  }

  async getAllServicesHealth(): Promise<
    Array<{
      serviceId: string;
      serviceName: string;
      healthyCount: number;
      totalCount: number;
      status: 'healthy' | 'unhealthy' | 'degraded';
    }>
  > {
    const services = await this.prisma.service.findMany({
      include: {
        instances: true,
      },
    });

    return services.map((service) => {
      const healthyCount = service.instances.filter((i) => i.healthy).length;
      const totalCount = service.instances.length;
      let status: 'healthy' | 'unhealthy' | 'degraded';

      if (!service.enabled) {
        status = 'unhealthy';
      } else if (totalCount === 0) {
        status = 'unhealthy';
      } else if (healthyCount === totalCount) {
        status = 'healthy';
      } else if (healthyCount === 0) {
        status = 'unhealthy';
      } else {
        status = 'degraded';
      }

      return {
        serviceId: service.id,
        serviceName: service.name,
        healthyCount,
        totalCount,
        status,
      };
    });
  }
}
