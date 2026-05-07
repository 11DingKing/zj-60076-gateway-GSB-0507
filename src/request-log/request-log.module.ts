import { Module } from "@nestjs/common";
import { RequestLogService } from "./request-log.service";
import { RequestLogController } from "./request-log.controller";
import { RequestLogMiddleware } from "./request-log.middleware";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RequestLogController],
  providers: [RequestLogService, RequestLogMiddleware],
  exports: [RequestLogService, RequestLogMiddleware],
})
export class RequestLogModule {}
