import { Module, forwardRef } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { GrayRouteService } from './gray-route.service';
import { RoutesController } from './routes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [RoutesController],
  providers: [RoutesService, GrayRouteService],
  exports: [RoutesService, GrayRouteService],
})
export class RoutesModule {}
