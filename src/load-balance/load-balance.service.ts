import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoadBalanceStrategy } from '@prisma/client';

@Injectable()
export class LoadBalanceService {
  private roundRobinCounters: Map<string, number> = new Map();

  constructor(private prisma: PrismaService) {}

  async getNextInstance(serviceId: string): Promise<string | null> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        instances: {
          where: { healthy: true },
        },
      },
    });

    if (!service || !service.instances.length) {
      return null;
    }

    const healthyInstances = service.instances;

    if (healthyInstances.length === 1) {
      return healthyInstances[0].url;
    }

    switch (service.loadBalanceStrategy) {
      case LoadBalanceStrategy.ROUND_ROBIN:
        return this.roundRobin(serviceId, healthyInstances.map((i) => i.url));
      case LoadBalanceStrategy.RANDOM:
        return this.random(healthyInstances.map((i) => i.url));
      default:
        return this.roundRobin(serviceId, healthyInstances.map((i) => i.url));
    }
  }

  private roundRobin(serviceId: string, instances: string[]): string {
    if (!this.roundRobinCounters.has(serviceId)) {
      this.roundRobinCounters.set(serviceId, 0);
    }

    const counter = this.roundRobinCounters.get(serviceId)!;
    const index = counter % instances.length;
    this.roundRobinCounters.set(serviceId, (counter + 1) % instances.length);

    return instances[index];
  }

  private random(instances: string[]): string {
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  resetCounter(serviceId: string): void {
    this.roundRobinCounters.delete(serviceId);
  }
}
