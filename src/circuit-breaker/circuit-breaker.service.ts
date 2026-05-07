import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CircuitBreakerStatus } from '@prisma/client';

@Injectable()
export class CircuitBreakerService {
  constructor(private prisma: PrismaService) {}

  async isCircuitOpen(serviceId: string): Promise<boolean> {
    const circuitBreaker = await this.prisma.circuitBreaker.findUnique({
      where: { serviceId },
    });

    if (!circuitBreaker) {
      return false;
    }

    if (circuitBreaker.status === CircuitBreakerStatus.OPEN) {
      if (circuitBreaker.openUntil && new Date() > circuitBreaker.openUntil) {
        await this.prisma.circuitBreaker.update({
          where: { serviceId },
          data: {
            status: CircuitBreakerStatus.HALF_OPEN,
            halfOpenRequests: 0,
            updatedAt: new Date(),
          },
        });
        return false;
      }
      return true;
    }

    if (circuitBreaker.status === CircuitBreakerStatus.HALF_OPEN) {
      return false;
    }

    return false;
  }

  async recordSuccess(serviceId: string): Promise<void> {
    let circuitBreaker = await this.prisma.circuitBreaker.findUnique({
      where: { serviceId },
    });

    if (!circuitBreaker) {
      circuitBreaker = await this.prisma.circuitBreaker.create({
        data: {
          serviceId,
          status: CircuitBreakerStatus.CLOSED,
          failureCount: 0,
          successCount: 1,
          lastSuccessTime: new Date(),
        },
      });
      return;
    }

    if (circuitBreaker.status === CircuitBreakerStatus.HALF_OPEN) {
      const newHalfOpenRequests = circuitBreaker.halfOpenRequests + 1;
      const threshold = 3;

      if (newHalfOpenRequests >= threshold) {
        await this.prisma.circuitBreaker.update({
          where: { serviceId },
          data: {
            status: CircuitBreakerStatus.CLOSED,
            failureCount: 0,
            successCount: 0,
            halfOpenRequests: 0,
            lastSuccessTime: new Date(),
            updatedAt: new Date(),
          },
        });
      } else {
        await this.prisma.circuitBreaker.update({
          where: { serviceId },
          data: {
            halfOpenRequests: newHalfOpenRequests,
            successCount: circuitBreaker.successCount + 1,
            lastSuccessTime: new Date(),
            updatedAt: new Date(),
          },
        });
      }
    } else {
      await this.prisma.circuitBreaker.update({
        where: { serviceId },
        data: {
          successCount: circuitBreaker.successCount + 1,
          failureCount: 0,
          lastSuccessTime: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }

  async recordFailure(serviceId: string): Promise<void> {
    let circuitBreaker = await this.prisma.circuitBreaker.findUnique({
      where: { serviceId },
    });

    if (!circuitBreaker) {
      circuitBreaker = await this.prisma.circuitBreaker.create({
        data: {
          serviceId,
          status: CircuitBreakerStatus.CLOSED,
          failureCount: 1,
          successCount: 0,
          lastFailureTime: new Date(),
        },
      });
      return;
    }

    const newFailureCount = circuitBreaker.failureCount + 1;

    if (circuitBreaker.status === CircuitBreakerStatus.HALF_OPEN) {
      const openUntil = new Date(Date.now() + circuitBreaker.timeout);
      await this.prisma.circuitBreaker.update({
        where: { serviceId },
        data: {
          status: CircuitBreakerStatus.OPEN,
          failureCount: newFailureCount,
          halfOpenRequests: 0,
          lastFailureTime: new Date(),
          openUntil,
          updatedAt: new Date(),
        },
      });
    } else if (newFailureCount >= circuitBreaker.failureThreshold) {
      const openUntil = new Date(Date.now() + circuitBreaker.timeout);
      await this.prisma.circuitBreaker.update({
        where: { serviceId },
        data: {
          status: CircuitBreakerStatus.OPEN,
          failureCount: newFailureCount,
          lastFailureTime: new Date(),
          openUntil,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.circuitBreaker.update({
        where: { serviceId },
        data: {
          failureCount: newFailureCount,
          lastFailureTime: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }

  async getCircuitBreakerStatus(serviceId: string) {
    return this.prisma.circuitBreaker.findUnique({
      where: { serviceId },
    });
  }

  async resetCircuitBreaker(serviceId: string) {
    const circuitBreaker = await this.prisma.circuitBreaker.findUnique({
      where: { serviceId },
    });

    if (!circuitBreaker) {
      return this.prisma.circuitBreaker.create({
        data: {
          serviceId,
          status: CircuitBreakerStatus.CLOSED,
          failureCount: 0,
          successCount: 0,
          halfOpenRequests: 0,
        },
      });
    }

    return this.prisma.circuitBreaker.update({
      where: { serviceId },
      data: {
        status: CircuitBreakerStatus.CLOSED,
        failureCount: 0,
        successCount: 0,
        halfOpenRequests: 0,
        openUntil: null,
        updatedAt: new Date(),
      },
    });
  }
}
