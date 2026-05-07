import { Module } from '@nestjs/common';
import { RequestLogService } from './request-log.service';
import { RequestLogController } from './request-log.controller';
import { RequestLogMiddleware } from './request-log.middleware';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RequestLogController],
  providers: [RequestLogService, RequestLogMiddleware],
  exports: [RequestLogService, RequestLogMiddleware],
})
export class RequestLogModule {}
