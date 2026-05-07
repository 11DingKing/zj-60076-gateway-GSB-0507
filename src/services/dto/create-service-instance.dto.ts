import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class CreateServiceInstanceDto {
  @ApiProperty({ description: '实例 URL' })
  @IsUrl()
  url: string;
}
