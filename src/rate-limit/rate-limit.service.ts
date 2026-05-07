import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RateLimitRule } from '@prisma/client';

@Injectable()
export class RateLimitService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(createRateLimitRuleDto: any) {
    return this.prisma.rateLimitRule.create({
      data: createRateLimitRuleDto,
    });
  }

  async findAll() {
    return this.prisma.rateLimitRule.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.rateLimitRule.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateRateLimitRuleDto: any) {
    return this.prisma.rateLimitRule.update({
      where: { id },
      data: {
        ...updateRateLimitRuleDto,
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.rateLimitRule.delete({
      where: { id },
    });
  }

  async matchRule(
    path: string,
    method: string,
  ): Promise<RateLimitRule | null> {
    const rules = await this.prisma.rateLimitRule.findMany({
      where: {
        enabled: true,
      },
    });

    for (const rule of rules) {
      if (this.pathMatches(rule.path, path) && this.methodMatches(rule.method, method)) {
        return rule;
      }
    }

    return null;
  }

  private pathMatches(rulePath: string, requestPath: string): boolean {
    if (rulePath === requestPath) {
      return true;
    }

    if (rulePath.endsWith('/*')) {
      const prefix = rulePath.slice(0, -2);
      return requestPath === prefix || requestPath.startsWith(prefix + '/');
    }

    return false;
  }

  private methodMatches(ruleMethod: string | null, requestMethod: string): boolean {
    if (!ruleMethod || ruleMethod === '*') {
      return true;
    }

    return ruleMethod.toUpperCase() === requestMethod.toUpperCase();
  }

  async isAllowed(
    rule: RateLimitRule,
    ip: string,
    userId?: string,
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = this.generateKey(rule, ip, userId);

    const now = Math.floor(Date.now() / 1000);

    if (rule.limitPerSecond !== undefined && rule.limitPerSecond !== null) {
      const secondKey = `${key}:second:${now}`;
      const secondCount = await this.redisService.incr(secondKey);
      if (secondCount === 1) {
        await this.redisService.expire(secondKey, 1);
      }
      if (secondCount > rule.limitPerSecond) {
        return { allowed: false, retryAfter: 1 };
      }
    }

    if (rule.limitPerMinute !== undefined && rule.limitPerMinute !== null) {
      const minute = Math.floor(now / 60);
      const minuteKey = `${key}:minute:${minute}`;
      const minuteCount = await this.redisService.incr(minuteKey);
      if (minuteCount === 1) {
        await this.redisService.expire(minuteKey, 60);
      }
      if (minuteCount > rule.limitPerMinute) {
        const remainingSeconds = 60 - (now % 60);
        return { allowed: false, retryAfter: remainingSeconds };
      }
    }

    if (rule.limitPerHour !== undefined && rule.limitPerHour !== null) {
      const hour = Math.floor(now / 3600);
      const hourKey = `${key}:hour:${hour}`;
      const hourCount = await this.redisService.incr(hourKey);
      if (hourCount === 1) {
        await this.redisService.expire(hourKey, 3600);
      }
      if (hourCount > rule.limitPerHour) {
        const remainingSeconds = 3600 - (now % 3600);
        return { allowed: false, retryAfter: remainingSeconds };
      }
    }

    return { allowed: true };
  }

  private generateKey(rule: RateLimitRule, ip: string, userId?: string): string {
    switch (rule.dimension.toLowerCase()) {
      case 'ip':
        return `ratelimit:${rule.id}:ip:${ip}`;
      case 'user':
        return `ratelimit:${rule.id}:user:${userId || 'anonymous'}`;
      case 'path':
        return `ratelimit:${rule.id}:path:${rule.path}`;
      default:
        return `ratelimit:${rule.id}:ip:${ip}`;
    }
  }
}
