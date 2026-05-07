import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateRateLimitRuleDto {
  @ApiProperty({ description: 'API 路径，支持通配符' })
  @IsString()
  path: string;

  @ApiProperty({ description: 'HTTP 方法，* 表示所有方法', default: '*', required: false })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({ description: '限流维度：ip, user, path' })
  @IsString()
  dimension: string;

  @ApiProperty({ description: '每秒允许的请求数', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  limitPerSecond?: number;

  @ApiProperty({ description: '每分钟允许的请求数', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  limitPerMinute?: number;

  @ApiProperty({ description: '每小时允许的请求数', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  limitPerHour?: number;

  @ApiProperty({ description: '是否启用', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
