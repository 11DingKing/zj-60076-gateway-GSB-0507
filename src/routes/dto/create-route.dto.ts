import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsObject, IsInt, Min } from 'class-validator';
import { AuthType } from '@prisma/client';

export class CreateRouteDto {
  @ApiProperty({ description: '关联的服务 ID' })
  @IsString()
  serviceId: string;

  @ApiProperty({ description: '请求路径前缀，支持通配符，如 /api/user/*' })
  @IsString()
  path: string;

  @ApiProperty({ description: 'HTTP 方法，* 表示所有方法', default: '*', required: false })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({ description: '路径重写规则，如 /* 表示去掉前缀', required: false })
  @IsOptional()
  @IsString()
  rewritePath?: string;

  @ApiProperty({ description: '认证类型', enum: AuthType, default: AuthType.NONE, required: false })
  @IsOptional()
  @IsEnum(AuthType)
  authType?: AuthType;

  @ApiProperty({ description: '是否启用', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: '额外注入的请求头', required: false })
  @IsOptional()
  @IsObject()
  extraHeaders?: Record<string, string>;

  @ApiProperty({ description: '路由级 QPS 上限', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitQps?: number;

  @ApiProperty({ description: 'IP 级 QPS 上限', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  ipRateLimitQps?: number;

  @ApiProperty({ description: '租户 ID', required: false })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({
    description: '灰度规则 JSON 数组，支持 header/percentage/ip_whitelist 三种类型',
    required: false,
    example: [
      { type: 'header', headerName: 'X-User-Id', headerModulo: 100, headerThreshold: 20 },
      { type: 'percentage', percentage: 10 },
      { type: 'ip_whitelist', ipWhitelist: ['127.0.0.1', '192.168.1.1'] },
    ],
  })
  @IsOptional()
  @IsObject()
  grayRules?: any;

  @ApiProperty({ description: '灰度上游地址', required: false, example: 'http://gray-service:8080' })
  @IsOptional()
  @IsString()
  grayUpstream?: string;
}
