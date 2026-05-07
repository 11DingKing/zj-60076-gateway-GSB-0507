import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { Route, Service, AuthType } from '@prisma/client';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async create(createRouteDto: CreateRouteDto) {
    const service = await this.prisma.service.findUnique({
      where: { id: createRouteDto.serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service with id '${createRouteDto.serviceId}' not found`);
    }

    return this.prisma.route.create({
      data: {
        ...createRouteDto,
      },
      include: {
        service: true,
        tenant: true,
      },
    });
  }

  async findAll() {
    return this.prisma.route.findMany({
      include: {
        service: true,
        tenant: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        service: true,
        tenant: true,
      },
    });

    if (!route) {
      throw new NotFoundException(`Route with id '${id}' not found`);
    }

    return route;
  }

  async update(id: string, updateRouteDto: UpdateRouteDto) {
    await this.findOne(id);

    return this.prisma.route.update({
      where: { id },
      data: {
        ...updateRouteDto,
        updatedAt: new Date(),
      },
      include: {
        service: true,
        tenant: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.route.delete({
      where: { id },
    });
  }

  async matchRoute(
    path: string,
    method: string,
  ): Promise<(Route & { service: Service }) | null> {
    const routes = await this.prisma.route.findMany({
      where: {
        enabled: true,
        service: {
          enabled: true,
        },
      },
      include: {
        service: true,
      },
    });

    for (const route of routes) {
      if (this.pathMatches(route.path, path) && this.methodMatches(route.method, method)) {
        return route;
      }
    }

    return null;
  }

  private pathMatches(routePath: string, requestPath: string): boolean {
    if (routePath === requestPath) {
      return true;
    }

    if (routePath.endsWith('/*')) {
      const prefix = routePath.slice(0, -2);
      return requestPath === prefix || requestPath.startsWith(prefix + '/');
    }

    if (routePath.endsWith('/')) {
      return requestPath === routePath.slice(0, -1) || requestPath.startsWith(routePath);
    }

    return false;
  }

  private methodMatches(routeMethod: string | null, requestMethod: string): boolean {
    if (!routeMethod || routeMethod === '*') {
      return true;
    }

    const methods = routeMethod.split(',').map((m) => m.trim().toUpperCase());
    return methods.includes(requestMethod.toUpperCase());
  }

  rewritePath(originalPath: string, routePath: string, rewritePath: string | null): string {
    if (!rewritePath) {
      return originalPath;
    }

    if (routePath.endsWith('/*') && rewritePath.endsWith('/*')) {
      const prefix = routePath.slice(0, -2);
      const rewritePrefix = rewritePath.slice(0, -2);
      return originalPath.replace(prefix, rewritePrefix);
    }

    if (routePath.endsWith('/*') && !rewritePath.includes('*')) {
      const prefix = routePath.slice(0, -2);
      const remaining = originalPath.slice(prefix.length);
      return rewritePath + remaining;
    }

    return rewritePath;
  }
}
