import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateTenantRateLimitDto {
  @ApiProperty({ description: '租户 ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: 'QPS 上限' })
  @IsInt()
  @Min(0)
  qpsLimit: number;

  @ApiProperty({ description: '是否启用', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateTenantRateLimitDto {
  @ApiProperty({ description: 'QPS 上限', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  qpsLimit?: number;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
