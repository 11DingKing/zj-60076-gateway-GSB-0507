import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ServicesModule } from './services/services.module';
import { RoutesModule } from './routes/routes.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { AuthModule } from './auth/auth.module';
import { RequestLogModule } from './request-log/request-log.module';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';
import { LoadBalanceModule } from './load-balance/load-balance.module';
import { HealthCheckModule } from './health-check/health-check.module';
import { ProxyModule } from './proxy/proxy.module';
import { AuthMiddleware } from './auth/auth.middleware';
import { RateLimitMiddleware } from './rate-limit/rate-limit.middleware';
import { RequestLogMiddleware } from './request-log/request-log.middleware';
import { ProxyMiddleware } from './proxy/proxy.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    ServicesModule,
    RoutesModule,
    RateLimitModule,
    AuthModule,
    RequestLogModule,
    CircuitBreakerModule,
    LoadBalanceModule,
    HealthCheckModule,
    ProxyModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLogMiddleware, RateLimitMiddleware, AuthMiddleware, ProxyMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
