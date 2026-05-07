import { Module } from "@nestjs/common";
import { RateLimitService } from "./rate-limit.service";
import { RateLimitController } from "./rate-limit.controller";
import { RateLimitMiddleware } from "./rate-limit.middleware";
import { RateLimitGuard } from "./rate-limit.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [RateLimitController],
  providers: [RateLimitService, RateLimitMiddleware, RateLimitGuard],
  exports: [RateLimitService, RateLimitMiddleware, RateLimitGuard],
})
export class RateLimitModule {}
