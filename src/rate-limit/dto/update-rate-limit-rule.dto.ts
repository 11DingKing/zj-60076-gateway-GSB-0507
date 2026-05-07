import { PartialType } from '@nestjs/swagger';
import { CreateRateLimitRuleDto } from './create-rate-limit-rule.dto';

export class UpdateRateLimitRuleDto extends PartialType(CreateRateLimitRuleDto) {}
