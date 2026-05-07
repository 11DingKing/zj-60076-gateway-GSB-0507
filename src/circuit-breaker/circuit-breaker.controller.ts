import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CircuitBreakerService } from './circuit-breaker.service';

@ApiTags('circuit-breaker')
@ApiBearerAuth()
@Controller('circuit-breaker')
export class CircuitBreakerController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  @Get(':serviceId')
  @ApiOperation({ summary: '获取指定服务的熔断器状态' })
  @ApiResponse({ status: 200, description: '获取熔断器状态成功' })
  getStatus(@Param('serviceId') serviceId: string) {
    return this.circuitBreakerService.getCircuitBreakerStatus(serviceId);
  }

  @Post(':serviceId/reset')
  @ApiOperation({ summary: '重置指定服务的熔断器状态' })
  @ApiResponse({ status: 200, description: '熔断器重置成功' })
  reset(@Param('serviceId') serviceId: string) {
    return this.circuitBreakerService.resetCircuitBreaker(serviceId);
  }
}
