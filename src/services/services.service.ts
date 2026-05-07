import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateServiceInstanceDto } from './dto/create-service-instance.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async create(createServiceDto: CreateServiceDto) {
    const existingService = await this.prisma.service.findUnique({
      where: { name: createServiceDto.name },
    });

    if (existingService) {
      throw new ConflictException(`Service with name '${createServiceDto.name}' already exists`);
    }

    return this.prisma.service.create({
      data: {
        ...createServiceDto,
      },
      include: {
        instances: true,
        routes: true,
        circuitBreaker: true,
      },
    });
  }

  async findAll() {
    return this.prisma.service.findMany({
      include: {
        instances: true,
        routes: true,
        circuitBreaker: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        instances: true,
        routes: true,
        circuitBreaker: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with id '${id}' not found`);
    }

    return service;
  }

  async findByName(name: string) {
    const service = await this.prisma.service.findUnique({
      where: { name },
      include: {
        instances: true,
        routes: true,
        circuitBreaker: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with name '${name}' not found`);
    }

    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    await this.findOne(id);

    return this.prisma.service.update({
      where: { id },
      data: {
        ...updateServiceDto,
        updatedAt: new Date(),
      },
      include: {
        instances: true,
        routes: true,
        circuitBreaker: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.service.delete({
      where: { id },
    });
  }

  async addInstance(serviceId: string, createServiceInstanceDto: CreateServiceInstanceDto) {
    await this.findOne(serviceId);

    const existingInstance = await this.prisma.serviceInstance.findUnique({
      where: {
        serviceId_url: {
          serviceId,
          url: createServiceInstanceDto.url,
        },
      },
    });

    if (existingInstance) {
      throw new ConflictException(`Instance with url '${createServiceInstanceDto.url}' already exists for this service`);
    }

    return this.prisma.serviceInstance.create({
      data: {
        serviceId,
        url: createServiceInstanceDto.url,
      },
      include: {
        service: true,
      },
    });
  }

  async removeInstance(serviceId: string, instanceId: string) {
    await this.findOne(serviceId);

    const instance = await this.prisma.serviceInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance || instance.serviceId !== serviceId) {
      throw new NotFoundException(`Instance with id '${instanceId}' not found for service '${serviceId}'`);
    }

    return this.prisma.serviceInstance.delete({
      where: { id: instanceId },
    });
  }

  async getHealthyInstances(serviceId: string) {
    return this.prisma.serviceInstance.findMany({
      where: {
        serviceId,
        healthy: true,
      },
    });
  }

  async updateInstanceHealth(instanceId: string, healthy: boolean) {
    return this.prisma.serviceInstance.update({
      where: { id: instanceId },
      data: {
        healthy,
        lastCheck: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
