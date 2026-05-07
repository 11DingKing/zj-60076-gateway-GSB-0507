import { Controller, Get, Post, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HealthCheckService } from './health-check.service';

@ApiTags('health-check')
@ApiBearerAuth()
@Controller('health-check')
export class HealthCheckController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiOperation({ summary: '获取所有服务的健康状态' })
  @ApiResponse({ status: 200, description: '获取所有服务健康状态成功' })
  async getAllServicesHealth() {
    return this.healthCheckService.getAllServicesHealth();
  }

  @Post('trigger')
  @ApiOperation({ summary: '手动触发健康检查' })
  @ApiResponse({ status: 200, description: '健康检查触发成功' })
  async triggerManualCheck() {
    await this.healthCheckService.triggerManualCheck();
    return { message: 'Health check triggered successfully' };
  }

  @Get(':serviceId')
  @ApiOperation({ summary: '获取指定服务的健康状态' })
  @ApiResponse({ status: 200, description: '获取服务健康状态成功' })
  @ApiResponse({ status: 404, description: '服务不存在' })
  async getServiceHealth(@Param('serviceId') serviceId: string) {
    try {
      return await this.healthCheckService.getServiceHealth(serviceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Service not found';
      throw new NotFoundException(message);
    }
  }
}
