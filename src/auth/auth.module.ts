import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from './auth.middleware';
import { PrismaModule } from '../prisma/prisma.module';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [PrismaModule, RoutesModule],
  controllers: [AuthController],
  providers: [AuthService, AuthMiddleware],
  exports: [AuthService, AuthMiddleware],
})
export class AuthModule {}
