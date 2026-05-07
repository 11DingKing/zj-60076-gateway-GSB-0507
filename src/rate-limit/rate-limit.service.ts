import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RateLimitRule } from '@prisma/client';
import { RateLimitScope, RateLimitCheckResult } from './rate-limit.guard';

interface RateLimitCheckParams {
  routeId?: string;
  routePath: string;
  routeMethod: string;
  ip: string;
  tenantId?: string;
}

interface SlidingWindowResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

const WINDOW_SIZE_MS = 1000;
const SLIDE_INTERVAL_MS = 100;

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
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.rateLimitRule.findUnique({ where: { id } });
  }

  async update(id: string, updateRateLimitRuleDto: any) {
    return this.prisma.rateLimitRule.update({
      where: { id },
      data: { ...updateRateLimitRuleDto, updatedAt: new Date() },
    });
  }

  async remove(id: string) {
    return this.prisma.rateLimitRule.delete({ where: { id } });
  }

  async matchRule(
    path: string,
    method: string,
  ): Promise<RateLimitRule | null> {
    const rules = await this.prisma.rateLimitRule.findMany({
      where: { enabled: true },
    });

    for (const rule of rules) {
      if (this.pathMatches(rule.path, path) && this.methodMatches(rule.method, method)) {
        return rule;
      }
    }

    return null;
  }

  private pathMatches(rulePath: string, requestPath: string): boolean {
    if (rulePath === requestPath) return true;
    if (rulePath.endsWith('/*')) {
      const prefix = rulePath.slice(0, -2);
      return requestPath === prefix || requestPath.startsWith(prefix + '/');
    }
    return false;
  }

  private methodMatches(ruleMethod: string | null, requestMethod: string): boolean {
    if (!ruleMethod || ruleMethod === '*') return true;
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

  private generateKey(
    rule: RateLimitRule,
    ip: string,
    userId?: string,
  ): string {
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

  async checkRateLimit(params: RateLimitCheckParams): Promise<RateLimitCheckResult> {
    const now = Date.now();

    let mostStrict: RateLimitCheckResult & { scope?: RateLimitScope } = {
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: now + WINDOW_SIZE_MS,
    };

    const routeResult = await this.checkRouteLevel(params);
    if (!routeResult.allowed) {
      mostStrict = { ...routeResult, scope: 'route' };
    } else if (routeResult.remaining < mostStrict.remaining) {
      mostStrict = { ...mostStrict, remaining: routeResult.remaining, reset: routeResult.reset };
    }

    const tenantResult = await this.checkTenantLevel(params);
    if (!tenantResult.allowed) {
      mostStrict = { ...tenantResult, scope: 'tenant' };
    } else if (tenantResult.remaining < mostStrict.remaining) {
      mostStrict = { ...mostStrict, remaining: tenantResult.remaining, reset: tenantResult.reset };
    }

    const ipResult = await this.checkIpLevel(params);
    if (!ipResult.allowed) {
      mostStrict = { ...ipResult, scope: 'ip' };
    } else if (ipResult.remaining < mostStrict.remaining) {
      mostStrict = { ...mostStrict, remaining: ipResult.remaining, reset: ipResult.reset };
    }

    if (mostStrict.scope) {
      return { allowed: false, remaining: 0, reset: mostStrict.reset, scope: mostStrict.scope };
    }

    return mostStrict;
  }

  private async checkRouteLevel(params: RateLimitCheckParams): Promise<SlidingWindowResult> {
    let routeQps: number | null = null;
    let matchedRouteId: string | null = null;

    if (params.routeId) {
      const route = await this.prisma.route.findUnique({
        where: { id: params.routeId },
      });
      if (route && route.rateLimitQps !== null && route.rateLimitQps !== undefined) {
        routeQps = route.rateLimitQps;
        matchedRouteId = route.id;
      }
    }

    if (routeQps === null) {
      const routes = await this.prisma.route.findMany({
        where: { enabled: true },
      });

      for (const route of routes) {
        if (this.routePathMatches(route.path, params.routePath) &&
            this.routeMethodMatches(route.method, params.routeMethod)) {
          if (route.rateLimitQps !== null && route.rateLimitQps !== undefined) {
            routeQps = route.rateLimitQps;
            matchedRouteId = route.id;
          }
          break;
        }
      }
    }

    if (routeQps === null) {
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, reset: Date.now() + WINDOW_SIZE_MS };
    }

    const key = `rl:route:${matchedRouteId || params.routePath}`;
    return this.checkSlidingWindow(key, routeQps);
  }

  private routePathMatches(routePath: string, requestPath: string): boolean {
    if (routePath === requestPath) return true;
    if (routePath.endsWith('/*')) {
      const prefix = routePath.slice(0, -2);
      return requestPath === prefix || requestPath.startsWith(prefix + '/');
    }
    return false;
  }

  private routeMethodMatches(routeMethod: string | null, requestMethod: string): boolean {
    if (!routeMethod || routeMethod === '*') return true;
    return routeMethod.toUpperCase() === requestMethod.toUpperCase();
  }

  private async checkTenantLevel(params: RateLimitCheckParams): Promise<SlidingWindowResult> {
    if (!params.tenantId) {
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, reset: Date.now() + WINDOW_SIZE_MS };
    }

    const tenantLimit = await this.prisma.tenantRateLimit.findUnique({
      where: { tenantId: params.tenantId },
    });

    if (!tenantLimit || !tenantLimit.enabled) {
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, reset: Date.now() + WINDOW_SIZE_MS };
    }

    const key = `rl:tenant:${params.tenantId}`;
    return this.checkSlidingWindow(key, tenantLimit.qpsLimit);
  }

  private async checkIpLevel(params: RateLimitCheckParams): Promise<SlidingWindowResult> {
    const ipLimit = await this.prisma.ipRateLimit.findUnique({
      where: { ip: params.ip },
    });

    if (!ipLimit || !ipLimit.enabled) {
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, reset: Date.now() + WINDOW_SIZE_MS };
    }

    const key = `rl:ip:${params.ip}`;
    return this.checkSlidingWindow(key, ipLimit.qpsLimit);
  }

  private async checkSlidingWindow(key: string, limit: number): Promise<SlidingWindowResult> {
    const now = Date.now();
    const currentSlot = Math.floor(now / SLIDE_INTERVAL_MS);
    const windowSlots = Math.floor(WINDOW_SIZE_MS / SLIDE_INTERVAL_MS);
    const oldestSlot = currentSlot - windowSlots + 1;

    const luaScript = `
      local key = KEYS[1]
      local currentSlot = tonumber(ARGV[1])
      local oldestSlot = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      local windowMs = tonumber(ARGV[5])

      for i = oldestSlot - 1, currentSlot - 100, -1 do
        redis.call('HDEL', key, tostring(i))
      end

      local total = 0
      local slots = redis.call('HGETALL', key)
      for i = 1, #slots, 2 do
        local slot = tonumber(slots[i])
        if slot >= oldestSlot and slot <= currentSlot then
          total = total + tonumber(slots[i + 1])
        else
          redis.call('HDEL', key, slots[i])
        end
      end

      if total >= limit then
        local reset = now + windowMs
        return {0, 0, reset}
      end

      local currentCount = redis.call('HINCRBY', key, tostring(currentSlot), 1)
      redis.call('PEXPIRE', key, windowMs * 2)

      local remaining = limit - total - 1
      if remaining < 0 then remaining = 0 end

      local reset = now + windowMs

      return {1, remaining, reset}
    `;

    const result = await this.redisService.eval(
      luaScript,
      [key],
      [currentSlot, oldestSlot, limit, now, WINDOW_SIZE_MS],
    ) as number[];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      reset: result[2],
    };
  }

  async findAllTenantLimits() {
    return this.prisma.tenantRateLimit.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findTenantLimit(tenantId: string) {
    return this.prisma.tenantRateLimit.findUnique({ where: { tenantId } });
  }

  async createTenantLimit(data: { tenantId: string; qpsLimit: number; enabled?: boolean }) {
    return this.prisma.tenantRateLimit.create({
      data: { tenantId: data.tenantId, qpsLimit: data.qpsLimit, enabled: data.enabled ?? true },
    });
  }

  async updateTenantLimit(tenantId: string, data: { qpsLimit?: number; enabled?: boolean }) {
    return this.prisma.tenantRateLimit.update({
      where: { tenantId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteTenantLimit(tenantId: string) {
    return this.prisma.tenantRateLimit.delete({ where: { tenantId } });
  }

  async findAllIpLimits() {
    return this.prisma.ipRateLimit.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findIpLimit(ip: string) {
    return this.prisma.ipRateLimit.findUnique({ where: { ip } });
  }

  async createIpLimit(data: { ip: string; qpsLimit: number; enabled?: boolean }) {
    return this.prisma.ipRateLimit.create({
      data: { ip: data.ip, qpsLimit: data.qpsLimit, enabled: data.enabled ?? true },
    });
  }

  async updateIpLimit(ip: string, data: { qpsLimit?: number; enabled?: boolean }) {
    return this.prisma.ipRateLimit.update({
      where: { ip },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteIpLimit(ip: string) {
    return this.prisma.ipRateLimit.delete({ where: { ip } });
  }
}
