import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { RequestLogService } from "./request-log.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("request-logs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("request-logs")
export class RequestLogController {
  constructor(private readonly requestLogService: RequestLogService) {}

  @Get()
  @ApiOperation({ summary: "查询请求日志列表" })
  @ApiResponse({ status: 200, description: "获取请求日志列表成功" })
  @ApiQuery({ name: "path", required: false, description: "路径过滤" })
  @ApiQuery({ name: "method", required: false, description: "HTTP 方法过滤" })
  @ApiQuery({ name: "statusCode", required: false, description: "状态码过滤" })
  @ApiQuery({ name: "startDate", required: false, description: "开始日期" })
  @ApiQuery({ name: "endDate", required: false, description: "结束日期" })
  @ApiQuery({ name: "page", required: false, description: "页码", example: 1 })
  @ApiQuery({
    name: "pageSize",
    required: false,
    description: "每页大小",
    example: 20,
  })
  async findAll(
    @Query("path") path?: string,
    @Query("method") method?: string,
    @Query("statusCode") statusCode?: number,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    return this.requestLogService.findAll({
      path,
      method,
      statusCode: statusCode !== undefined ? Number(statusCode) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    });
  }

  @Get("stats")
  @ApiOperation({ summary: "获取请求统计信息" })
  @ApiResponse({ status: 200, description: "获取统计信息成功" })
  @ApiQuery({ name: "startDate", required: false, description: "开始日期" })
  @ApiQuery({ name: "endDate", required: false, description: "结束日期" })
  async getStats(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.requestLogService.getStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "根据 ID 获取请求日志详情" })
  @ApiResponse({ status: 200, description: "获取请求日志成功" })
  findOne(@Param("id") id: string) {
    return this.requestLogService.findOne(id);
  }
}
