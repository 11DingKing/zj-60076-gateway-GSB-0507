import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from './auth.middleware';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [PrismaModule, forwardRef(() => RoutesModule)],
  controllers: [AuthController],
  providers: [AuthService, AuthMiddleware, JwtAuthGuard],
  exports: [AuthService, AuthMiddleware, JwtAuthGuard],
})
export class AuthModule {}
