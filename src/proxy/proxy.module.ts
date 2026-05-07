import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ProxyMiddleware } from './proxy.middleware';
import { RoutesModule } from '../routes/routes.module';
import { LoadBalanceModule } from '../load-balance/load-balance.module';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';

@Module({
  imports: [RoutesModule, LoadBalanceModule, CircuitBreakerModule],
  providers: [ProxyService, ProxyMiddleware],
  exports: [ProxyService, ProxyMiddleware],
})
export class ProxyModule {}
