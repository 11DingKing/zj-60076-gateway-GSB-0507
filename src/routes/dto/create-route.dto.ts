import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsObject } from 'class-validator';
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
}
