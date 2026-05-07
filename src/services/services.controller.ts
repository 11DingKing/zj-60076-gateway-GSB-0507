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
import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { CreateServiceInstanceDto } from "./dto/create-service-instance.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("services")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: "创建新服务" })
  @ApiResponse({ status: 201, description: "服务创建成功" })
  @ApiResponse({ status: 409, description: "服务名称已存在" })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  @ApiOperation({ summary: "获取所有服务列表" })
  @ApiResponse({ status: 200, description: "获取服务列表成功" })
  findAll() {
    return this.servicesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "根据 ID 获取服务详情" })
  @ApiResponse({ status: 200, description: "获取服务详情成功" })
  @ApiResponse({ status: 404, description: "服务不存在" })
  findOne(@Param("id") id: string) {
    return this.servicesService.findOne(id);
  }

  @Get("name/:name")
  @ApiOperation({ summary: "根据名称获取服务详情" })
  @ApiResponse({ status: 200, description: "获取服务详情成功" })
  @ApiResponse({ status: 404, description: "服务不存在" })
  findByName(@Param("name") name: string) {
    return this.servicesService.findByName(name);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新服务信息" })
  @ApiResponse({ status: 200, description: "服务更新成功" })
  @ApiResponse({ status: 404, description: "服务不存在" })
  update(@Param("id") id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除服务" })
  @ApiResponse({ status: 200, description: "服务删除成功" })
  @ApiResponse({ status: 404, description: "服务不存在" })
  remove(@Param("id") id: string) {
    return this.servicesService.remove(id);
  }

  @Post(":id/instances")
  @ApiOperation({ summary: "为服务添加实例" })
  @ApiResponse({ status: 201, description: "实例添加成功" })
  @ApiResponse({ status: 404, description: "服务不存在" })
  @ApiResponse({ status: 409, description: "实例 URL 已存在" })
  addInstance(
    @Param("id") id: string,
    @Body() createServiceInstanceDto: CreateServiceInstanceDto,
  ) {
    return this.servicesService.addInstance(id, createServiceInstanceDto);
  }

  @Delete(":id/instances/:instanceId")
  @ApiOperation({ summary: "删除服务实例" })
  @ApiResponse({ status: 200, description: "实例删除成功" })
  @ApiResponse({ status: 404, description: "服务或实例不存在" })
  removeInstance(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
  ) {
    return this.servicesService.removeInstance(id, instanceId);
  }

  @Get(":id/instances")
  @ApiOperation({ summary: "获取服务的所有健康实例" })
  @ApiResponse({ status: 200, description: "获取实例列表成功" })
  getHealthyInstances(@Param("id") id: string) {
    return this.servicesService.getHealthyInstances(id);
  }
}
