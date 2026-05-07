import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RateLimitService } from "./rate-limit.service";
import { CreateRateLimitRuleDto } from "./dto/create-rate-limit-rule.dto";
import { UpdateRateLimitRuleDto } from "./dto/update-rate-limit-rule.dto";
import {
  CreateTenantRateLimitDto,
  UpdateTenantRateLimitDto,
} from "./dto/tenant-rate-limit.dto";
import {
  CreateIpRateLimitDto,
  UpdateIpRateLimitDto,
} from "./dto/ip-rate-limit.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("rate-limit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("rate-limit")
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Post()
  @ApiOperation({ summary: "创建限流规则" })
  @ApiResponse({ status: 201, description: "限流规则创建成功" })
  create(@Body() createRateLimitRuleDto: CreateRateLimitRuleDto) {
    return this.rateLimitService.create(createRateLimitRuleDto);
  }

  @Get()
  @ApiOperation({ summary: "获取所有限流规则" })
  @ApiResponse({ status: 200, description: "获取限流规则列表成功" })
  findAll() {
    return this.rateLimitService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "根据 ID 获取限流规则详情" })
  @ApiResponse({ status: 200, description: "获取限流规则成功" })
  findOne(@Param("id") id: string) {
    return this.rateLimitService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新限流规则" })
  @ApiResponse({ status: 200, description: "限流规则更新成功" })
  update(
    @Param("id") id: string,
    @Body() updateRateLimitRuleDto: UpdateRateLimitRuleDto,
  ) {
    return this.rateLimitService.update(id, updateRateLimitRuleDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除限流规则" })
  @ApiResponse({ status: 200, description: "限流规则删除成功" })
  remove(@Param("id") id: string) {
    return this.rateLimitService.remove(id);
  }

  @Get("tenant/limits")
  @ApiOperation({ summary: "获取所有租户限流配置" })
  @ApiResponse({ status: 200, description: "获取租户限流列表成功" })
  findAllTenantLimits() {
    return this.rateLimitService.findAllTenantLimits();
  }

  @Get("tenant/limits/:tenantId")
  @ApiOperation({ summary: "获取指定租户限流配置" })
  @ApiResponse({ status: 200, description: "获取租户限流配置成功" })
  findTenantLimit(@Param("tenantId") tenantId: string) {
    return this.rateLimitService.findTenantLimit(tenantId);
  }

  @Post("tenant/limits")
  @ApiOperation({ summary: "创建租户限流配置" })
  @ApiResponse({ status: 201, description: "租户限流创建成功" })
  createTenantLimit(@Body() dto: CreateTenantRateLimitDto) {
    return this.rateLimitService.createTenantLimit(dto);
  }

  @Patch("tenant/limits/:tenantId")
  @ApiOperation({ summary: "更新租户限流配置" })
  @ApiResponse({ status: 200, description: "租户限流更新成功" })
  updateTenantLimit(
    @Param("tenantId") tenantId: string,
    @Body() dto: UpdateTenantRateLimitDto,
  ) {
    return this.rateLimitService.updateTenantLimit(tenantId, dto);
  }

  @Delete("tenant/limits/:tenantId")
  @ApiOperation({ summary: "删除租户限流配置" })
  @ApiResponse({ status: 200, description: "租户限流删除成功" })
  deleteTenantLimit(@Param("tenantId") tenantId: string) {
    return this.rateLimitService.deleteTenantLimit(tenantId);
  }

  @Get("ip/limits")
  @ApiOperation({ summary: "获取所有 IP 限流配置" })
  @ApiResponse({ status: 200, description: "获取 IP 限流列表成功" })
  findAllIpLimits() {
    return this.rateLimitService.findAllIpLimits();
  }

  @Get("ip/limits/:ip")
  @ApiOperation({ summary: "获取指定 IP 限流配置" })
  @ApiResponse({ status: 200, description: "获取 IP 限流配置成功" })
  findIpLimit(@Param("ip") ip: string) {
    return this.rateLimitService.findIpLimit(ip);
  }

  @Post("ip/limits")
  @ApiOperation({ summary: "创建 IP 限流配置" })
  @ApiResponse({ status: 201, description: "IP 限流创建成功" })
  createIpLimit(@Body() dto: CreateIpRateLimitDto) {
    return this.rateLimitService.createIpLimit(dto);
  }

  @Patch("ip/limits/:ip")
  @ApiOperation({ summary: "更新 IP 限流配置" })
  @ApiResponse({ status: 200, description: "IP 限流更新成功" })
  updateIpLimit(@Param("ip") ip: string, @Body() dto: UpdateIpRateLimitDto) {
    return this.rateLimitService.updateIpLimit(ip, dto);
  }

  @Delete("ip/limits/:ip")
  @ApiOperation({ summary: "删除 IP 限流配置" })
  @ApiResponse({ status: 200, description: "IP 限流删除成功" })
  deleteIpLimit(@Param("ip") ip: string) {
    return this.rateLimitService.deleteIpLimit(ip);
  }
}
