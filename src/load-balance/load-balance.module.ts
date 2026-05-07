import { Module } from '@nestjs/common';
import { LoadBalanceService } from './load-balance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LoadBalanceService],
  exports: [LoadBalanceService],
})
export class LoadBalanceModule {}
