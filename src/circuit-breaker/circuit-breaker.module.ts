import { Module } from "@nestjs/common";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { CircuitBreakerController } from "./circuit-breaker.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CircuitBreakerController],
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class CircuitBreakerModule {}
