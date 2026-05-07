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
import { RoutesService } from "./routes.service";
import { CreateRouteDto } from "./dto/create-route.dto";
import { UpdateRouteDto } from "./dto/update-route.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("routes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("routes")
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @ApiOperation({ summary: "创建新路由" })
  @ApiResponse({ status: 201, description: "路由创建成功" })
  @ApiResponse({ status: 404, description: "关联的服务不存在" })
  create(@Body() createRouteDto: CreateRouteDto) {
    return this.routesService.create(createRouteDto);
  }

  @Get()
  @ApiOperation({ summary: "获取所有路由列表" })
  @ApiResponse({ status: 200, description: "获取路由列表成功" })
  findAll() {
    return this.routesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "根据 ID 获取路由详情" })
  @ApiResponse({ status: 200, description: "获取路由详情成功" })
  @ApiResponse({ status: 404, description: "路由不存在" })
  findOne(@Param("id") id: string) {
    return this.routesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新路由信息" })
  @ApiResponse({ status: 200, description: "路由更新成功" })
  @ApiResponse({ status: 404, description: "路由不存在" })
  update(@Param("id") id: string, @Body() updateRouteDto: UpdateRouteDto) {
    return this.routesService.update(id, updateRouteDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除路由" })
  @ApiResponse({ status: 200, description: "路由删除成功" })
  @ApiResponse({ status: 404, description: "路由不存在" })
  remove(@Param("id") id: string) {
    return this.routesService.remove(id);
  }
}
