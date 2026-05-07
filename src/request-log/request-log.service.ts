import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestLogService {
  constructor(private prisma: PrismaService) {}

  async create(logData: {
    path: string;
    method: string;
    ip: string;
    statusCode: number;
    duration: number;
    serviceId?: string;
    routeId?: string;
    userAgent?: string;
    requestBody?: any;
    responseBody?: any;
  }): Promise<void> {
    await this.prisma.requestLog.create({
      data: {
        path: logData.path,
        method: logData.method,
        ip: logData.ip,
        statusCode: logData.statusCode,
        duration: logData.duration,
        serviceId: logData.serviceId,
        routeId: logData.routeId,
        userAgent: logData.userAgent,
        requestBody: logData.requestBody,
        responseBody: logData.responseBody,
      },
    });
  }

  async findAll(query: {
    path?: string;
    method?: string;
    statusCode?: number;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      path,
      method,
      statusCode,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {};

    if (path) {
      where.path = {
        contains: path,
      };
    }

    if (method) {
      where.method = method.toUpperCase();
    }

    if (statusCode !== undefined && statusCode !== null) {
      where.statusCode = statusCode;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.requestLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          timestamp: 'desc',
        },
      }),
      this.prisma.requestLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    return this.prisma.requestLog.findUnique({
      where: { id },
    });
  }

  async getStats(query: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalRequests: number;
    successRequests: number;
    errorRequests: number;
    avgDuration: number;
    requestsByPath: Array<{ path: string; count: number }>;
    requestsByStatusCode: Array<{ statusCode: number; count: number }>;
  }> {
    const { startDate, endDate } = query;

    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const totalRequests = await this.prisma.requestLog.count({ where });

    const successRequests = await this.prisma.requestLog.count({
      where: {
        ...where,
        statusCode: {
          gte: 200,
          lt: 400,
        },
      },
    });

    const errorRequests = await this.prisma.requestLog.count({
      where: {
        ...where,
        statusCode: {
          gte: 400,
        },
      },
    });

    const avgDurationResult = await this.prisma.requestLog.aggregate({
      where,
      _avg: {
        duration: true,
      },
    });

    const requestsByPath = await this.prisma.requestLog.groupBy({
      by: ['path'],
      where,
      _count: {
        path: true,
      },
      orderBy: {
        _count: {
          path: 'desc',
        },
      },
      take: 10,
    });

    const requestsByStatusCode = await this.prisma.requestLog.groupBy({
      by: ['statusCode'],
      where,
      _count: {
        statusCode: true,
      },
      orderBy: {
        statusCode: 'asc',
      },
    });

    return {
      totalRequests,
      successRequests,
      errorRequests,
      avgDuration: avgDurationResult._avg.duration || 0,
      requestsByPath: requestsByPath.map((item) => ({
        path: item.path,
        count: item._count.path,
      })),
      requestsByStatusCode: requestsByStatusCode.map((item) => ({
        statusCode: item.statusCode,
        count: item._count.statusCode,
      })),
    };
  }
}
