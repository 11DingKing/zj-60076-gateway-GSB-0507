import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ description: '租户名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '租户总 QPS 上限' })
  @IsInt()
  @Min(1)
  rateLimitQps: number;

  @ApiProperty({ description: '是否启用', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
