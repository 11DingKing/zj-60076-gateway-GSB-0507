import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsUrl, Min } from 'class-validator';
import { LoadBalanceStrategy } from '@prisma/client';

export class CreateServiceDto {
  @ApiProperty({ description: '服务名称，唯一标识' })
  @IsString()
  name: string;

  @ApiProperty({ description: '服务描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '服务基础 URL' })
  @IsUrl()
  baseUrl: string;

  @ApiProperty({ description: '健康检查路径', default: '/health', required: false })
  @IsOptional()
  @IsString()
  healthCheckPath?: string;

  @ApiProperty({ description: '超时时间（毫秒）', default: 5000, required: false })
  @IsOptional()
  @IsInt()
  @Min(1000)
  timeout?: number;

  @ApiProperty({ description: '是否启用', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: '负载均衡策略', enum: LoadBalanceStrategy, default: LoadBalanceStrategy.ROUND_ROBIN, required: false })
  @IsOptional()
  @IsEnum(LoadBalanceStrategy)
  loadBalanceStrategy?: LoadBalanceStrategy;
}
