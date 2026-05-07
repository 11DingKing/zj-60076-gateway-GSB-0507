import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('api-keys')
  @ApiOperation({ summary: '创建新的 API Key' })
  @ApiResponse({ status: 201, description: 'API Key 创建成功' })
  async createApiKey(@Body() body: { name: string; userId?: string }) {
    return this.authService.createApiKey(body.name, body.userId);
  }

  @Get('api-keys')
  @ApiOperation({ summary: '获取所有 API Key 列表' })
  @ApiResponse({ status: 200, description: '获取 API Key 列表成功' })
  async listApiKeys() {
    return this.authService.listApiKeys();
  }

  @Delete('api-keys/:id')
  @ApiOperation({ summary: '删除指定的 API Key' })
  @ApiResponse({ status: 200, description: 'API Key 删除成功' })
  async deleteApiKey(@Param('id') id: string) {
    await this.authService.deleteApiKey(id);
    return { message: 'API Key deleted successfully' };
  }

  @Post('api-keys/:id/toggle')
  @ApiOperation({ summary: '启用/禁用 API Key' })
  @ApiResponse({ status: 200, description: 'API Key 状态更新成功' })
  async toggleApiKey(@Param('id') id: string, @Body() body: { enabled: boolean }) {
    await this.authService.toggleApiKey(id, body.enabled);
    return { message: 'API Key status updated successfully' };
  }
}
