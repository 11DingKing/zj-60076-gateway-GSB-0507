import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RateLimitService } from './rate-limit.service';
import { CreateRateLimitRuleDto } from './dto/create-rate-limit-rule.dto';
import { UpdateRateLimitRuleDto } from './dto/update-rate-limit-rule.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('rate-limit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Post('rules')
  @ApiOperation({ summary: '创建限流规则' })
  @ApiResponse({ status: 201, description: '限流规则创建成功' })
  createRule(@Body() createRateLimitRuleDto: CreateRateLimitRuleDto) {
    return this.rateLimitService.createRateLimitRule(createRateLimitRuleDto);
  }

  @Get('rules')
  @ApiOperation({ summary: '获取所有限流规则' })
  @ApiResponse({ status: 200, description: '获取限流规则列表成功' })
  findAllRules() {
    return this.rateLimitService.findAllRateLimitRules();
  }

  @Get('rules/:id')
  @ApiOperation({ summary: '根据 ID 获取限流规则详情' })
  @ApiResponse({ status: 200, description: '获取限流规则成功' })
  findOneRule(@Param('id') id: string) {
    return this.rateLimitService.findOneRateLimitRule(id);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: '更新限流规则' })
  @ApiResponse({ status: 200, description: '限流规则更新成功' })
  updateRule(@Param('id') id: string, @Body() updateRateLimitRuleDto: UpdateRateLimitRuleDto) {
    return this.rateLimitService.updateRateLimitRule(id, updateRateLimitRuleDto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: '删除限流规则' })
  @ApiResponse({ status: 200, description: '限流规则删除成功' })
  removeRule(@Param('id') id: string) {
    return this.rateLimitService.removeRateLimitRule(id);
  }

  @Post('tenants')
  @ApiOperation({ summary: '创建租户' })
  @ApiResponse({ status: 201, description: '租户创建成功' })
  createTenant(@Body() createTenantDto: CreateTenantDto) {
    return this.rateLimitService.createTenant(createTenantDto);
  }

  @Get('tenants')
  @ApiOperation({ summary: '获取所有租户' })
  @ApiResponse({ status: 200, description: '获取租户列表成功' })
  findAllTenants() {
    return this.rateLimitService.findAllTenants();
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: '根据 ID 获取租户详情' })
  @ApiResponse({ status: 200, description: '获取租户详情成功' })
  findOneTenant(@Param('id') id: string) {
    return this.rateLimitService.findOneTenant(id);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: '更新租户' })
  @ApiResponse({ status: 200, description: '租户更新成功' })
  updateTenant(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.rateLimitService.updateTenant(id, updateTenantDto);
  }

  @Delete('tenants/:id')
  @ApiOperation({ summary: '删除租户' })
  @ApiResponse({ status: 200, description: '租户删除成功' })
  removeTenant(@Param('id') id: string) {
    return this.rateLimitService.removeTenant(id);
  }
}
