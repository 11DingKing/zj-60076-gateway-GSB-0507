import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RateLimitService } from './rate-limit.service';
import { CreateRateLimitRuleDto } from './dto/create-rate-limit-rule.dto';
import { UpdateRateLimitRuleDto } from './dto/update-rate-limit-rule.dto';

@ApiTags('rate-limit')
@ApiBearerAuth()
@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Post()
  @ApiOperation({ summary: '创建限流规则' })
  @ApiResponse({ status: 201, description: '限流规则创建成功' })
  create(@Body() createRateLimitRuleDto: CreateRateLimitRuleDto) {
    return this.rateLimitService.create(createRateLimitRuleDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有限流规则' })
  @ApiResponse({ status: 200, description: '获取限流规则列表成功' })
  findAll() {
    return this.rateLimitService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '根据 ID 获取限流规则详情' })
  @ApiResponse({ status: 200, description: '获取限流规则成功' })
  findOne(@Param('id') id: string) {
    return this.rateLimitService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新限流规则' })
  @ApiResponse({ status: 200, description: '限流规则更新成功' })
  update(@Param('id') id: string, @Body() updateRateLimitRuleDto: UpdateRateLimitRuleDto) {
    return this.rateLimitService.update(id, updateRateLimitRuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除限流规则' })
  @ApiResponse({ status: 200, description: '限流规则删除成功' })
  remove(@Param('id') id: string) {
    return this.rateLimitService.remove(id);
  }
}
