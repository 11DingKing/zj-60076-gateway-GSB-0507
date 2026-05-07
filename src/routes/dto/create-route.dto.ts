import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AuthType } from "@prisma/client";

export class HeaderRuleDto {
  @ApiProperty({ description: "Header 名称" })
  @IsString()
  header: string;

  @ApiProperty({
    description: "操作符：mod, eq, neq, gt, gte, lt, lte, contains, in",
  })
  @IsString()
  operator: string;

  @ApiProperty({ description: "比较值" })
  @IsString()
  value: string;

  @ApiProperty({
    description: "mod 操作符的模数（如 100 表示 % 100）",
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  modValue?: number;
}

export class PercentageRuleDto {
  @ApiProperty({ description: "百分比（0-100）" })
  @IsInt()
  @Min(0)
  @Max(100)
  percentage: number;
}

export class IpWhitelistRuleDto {
  @ApiProperty({ description: "IP 白名单列表" })
  @IsArray()
  @IsString({ each: true })
  ips: string[];
}

export class GrayRuleDto {
  @ApiProperty({
    description: "规则类型：header, percentage, ip",
    enum: ["header", "percentage", "ip"],
  })
  @IsString()
  type: "header" | "percentage" | "ip";

  @ApiProperty({ description: "Header 规则配置", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeaderRuleDto)
  headerRule?: HeaderRuleDto;

  @ApiProperty({ description: "百分比规则配置", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PercentageRuleDto)
  percentageRule?: PercentageRuleDto;

  @ApiProperty({ description: "IP 白名单规则配置", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => IpWhitelistRuleDto)
  ipRule?: IpWhitelistRuleDto;
}

export class CreateRouteDto {
  @ApiProperty({ description: "关联的服务 ID" })
  @IsString()
  serviceId: string;

  @ApiProperty({ description: "请求路径前缀，支持通配符，如 /api/user/*" })
  @IsString()
  path: string;

  @ApiProperty({
    description: "HTTP 方法，* 表示所有方法",
    default: "*",
    required: false,
  })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({
    description: "路径重写规则，如 /* 表示去掉前缀",
    required: false,
  })
  @IsOptional()
  @IsString()
  rewritePath?: string;

  @ApiProperty({
    description: "认证类型",
    enum: AuthType,
    default: AuthType.NONE,
    required: false,
  })
  @IsOptional()
  @IsEnum(AuthType)
  authType?: AuthType;

  @ApiProperty({ description: "是否启用", default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: "额外注入的请求头", required: false })
  @IsOptional()
  @IsObject()
  extraHeaders?: Record<string, string>;

  @ApiProperty({ description: "路由级 QPS 限制", required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  rateLimitQps?: number;

  @ApiProperty({
    description: "灰度规则配置，数组格式",
    required: false,
    type: [GrayRuleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrayRuleDto)
  grayRules?: GrayRuleDto[];

  @ApiProperty({
    description: "灰度上游地址，命中灰度规则时转发到此地址",
    required: false,
  })
  @IsOptional()
  @IsString()
  grayUpstream?: string;
}
