import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async validateJwtToken(token: string): Promise<{ userId: string; username: string }> {
    try {
      const jwt = require('jsonwebtoken');
      const secret = this.configService.get<string>('JWT_SECRET');
      const decoded = jwt.verify(token, secret) as any;
      
      return {
        userId: decoded.sub || decoded.userId,
        username: decoded.username || decoded.sub,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async validateApiKey(apiKey: string): Promise<{ id: string; name: string; userId: string | null }> {
    const foundApiKey = await this.prisma.apiKey.findFirst({
      where: {
        key: apiKey,
        enabled: true,
      },
    });

    if (!foundApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return {
      id: foundApiKey.id,
      name: foundApiKey.name,
      userId: foundApiKey.userId,
    };
  }

  extractTokenFromHeader(authorization: string | undefined): string | null {
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');
    if (type === 'Bearer' && token) {
      return token;
    }

    return null;
  }

  extractApiKeyFromHeader(headers: Record<string, any>): string | null {
    const apiKey = headers['x-api-key'] || headers['X-API-Key'] || headers['x-api-key'];
    return apiKey ? (Array.isArray(apiKey) ? apiKey[0] : apiKey) : null;
  }

  async createApiKey(name: string, userId?: string): Promise<{ id: string; key: string; name: string }> {
    const { v4: uuidv4 } = require('uuid');
    const key = `apikey_${uuidv4().replace(/-/g, '')}`;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        key,
        name,
        userId,
      },
    });

    return {
      id: apiKey.id,
      key: apiKey.key,
      name: apiKey.name,
    };
  }

  async listApiKeys(): Promise<{ id: string; name: string; userId: string | null; enabled: boolean; createdAt: Date }[]> {
    return this.prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        enabled: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.prisma.apiKey.delete({
      where: { id },
    });
  }

  async toggleApiKey(id: string, enabled: boolean): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: { enabled },
    });
  }
}
