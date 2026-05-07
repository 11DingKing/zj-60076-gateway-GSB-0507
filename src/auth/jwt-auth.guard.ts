import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const token = this.authService.extractTokenFromHeader(authorization);

    if (!token) {
      throw new UnauthorizedException('JWT token is required');
    }

    const user = await this.authService.validateJwtToken(token);
    request.user = user;
    return true;
  }
}
