import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window_ms)

local count = redis.call('ZCARD', key)

if count < limit then
  redis.call('ZADD', key, now, now .. ':' .. math.random(1, 1000000))
  redis.call('PEXPIRE', key, window_ms + 1000)
  return { 1, limit - count - 1, 0 }
else
  local earliest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset_ms = 0
  if #earliest >= 2 then
    reset_ms = tonumber(earliest[2]) + window_ms - now
    if reset_ms < 0 then reset_ms = 0 end
  end
  return { 0, 0, reset_ms }
end
`;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  scope: string | null;
}

@Injectable()
export class RateLimitService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async createTenant(dto: CreateTenantDto) {
    return this.prisma.tenant.create({ data: dto });
  }

  async findAllTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { routes: true },
    });
  }

  async findOneTenant(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { routes: true },
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
    });
  }

  async removeTenant(id: string) {
    return this.prisma.tenant.delete({ where: { id } });
  }

  async checkRateLimit(
    routeId: string,
    routePath: string,
    rateLimitQps: number | null,
    ipRateLimitQps: number | null,
    tenantId: string | null,
    clientIp: string,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = 1000;
    let strictest: RateLimitResult = {
      allowed: true,
      remaining: Infinity,
      resetMs: 0,
      scope: null,
    };

    if (rateLimitQps !== null && rateLimitQps !== undefined) {
      const routeResult = await this.slidingWindowCheck(
        `ratelimit:route:${routeId}`,
        now,
        windowMs,
        rateLimitQps,
      );
      const result: RateLimitResult = {
        allowed: routeResult[0] === 1,
        remaining: routeResult[1],
        resetMs: routeResult[2],
        scope: 'route',
      };
      if (!result.allowed || this.isStricter(result, strictest)) {
        strictest = result;
      }
    }

    if (ipRateLimitQps !== null && ipRateLimitQps !== undefined) {
      const ipResult = await this.slidingWindowCheck(
        `ratelimit:ip:${routeId}:${clientIp}`,
        now,
        windowMs,
        ipRateLimitQps,
      );
      const result: RateLimitResult = {
        allowed: ipResult[0] === 1,
        remaining: ipResult[1],
        resetMs: ipResult[2],
        scope: 'ip',
      };
      if (!result.allowed || this.isStricter(result, strictest)) {
        strictest = result;
      }
    }

    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (tenant && tenant.enabled) {
        const tenantResult = await this.slidingWindowCheck(
          `ratelimit:tenant:${tenantId}`,
          now,
          windowMs,
          tenant.rateLimitQps,
        );
        const result: RateLimitResult = {
          allowed: tenantResult[0] === 1,
          remaining: tenantResult[1],
          resetMs: tenantResult[2],
          scope: 'tenant',
        };
        if (!result.allowed || this.isStricter(result, strictest)) {
          strictest = result;
        }
      }
    }

    if (strictest.remaining === Infinity) {
      strictest.remaining = 0;
    }

    return strictest;
  }

  private isStricter(a: RateLimitResult, b: RateLimitResult): boolean {
    if (!a.allowed && b.allowed) return true;
    if (a.allowed && !b.allowed) return false;
    return a.remaining < b.remaining;
  }

  private async slidingWindowCheck(
    key: string,
    now: number,
    windowMs: number,
    limit: number,
  ): Promise<number[]> {
    const client = this.redisService.getClient();
    const result = await client.eval(
      SLIDING_WINDOW_LUA,
      1,
      key,
      now.toString(),
      windowMs.toString(),
      limit.toString(),
    );
    return result as number[];
  }

  async createRateLimitRule(dto: any) {
    return this.prisma.rateLimitRule.create({ data: dto });
  }

  async findAllRateLimitRules() {
    return this.prisma.rateLimitRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRateLimitRule(id: string) {
    return this.prisma.rateLimitRule.findUnique({ where: { id } });
  }

  async updateRateLimitRule(id: string, dto: any) {
    return this.prisma.rateLimitRule.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
    });
  }

  async removeRateLimitRule(id: string) {
    return this.prisma.rateLimitRule.delete({ where: { id } });
  }
}
