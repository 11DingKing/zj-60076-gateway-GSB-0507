import { Injectable } from '@nestjs/common';
import { Request } from 'express';

interface HeaderRule {
  header: string;
  operator: string;
  value: string;
  modValue?: number;
}

interface PercentageRule {
  percentage: number;
}

interface IpWhitelistRule {
  ips: string[];
}

interface GrayRule {
  type: 'header' | 'percentage' | 'ip';
  headerRule?: HeaderRule;
  percentageRule?: PercentageRule;
  ipRule?: IpWhitelistRule;
}

@Injectable()
export class GrayRouteService {
  shouldRouteToGray(
    grayRules: GrayRule[] | null | undefined,
    grayUpstream: string | null | undefined,
    request: Request,
  ): boolean {
    if (!grayRules || grayRules.length === 0 || !grayUpstream) {
      return false;
    }

    for (const rule of grayRules) {
      if (this.matchRule(rule, request)) {
        return true;
      }
    }

    return false;
  }

  private matchRule(rule: GrayRule, request: Request): boolean {
    switch (rule.type) {
      case 'header':
        return this.matchHeaderRule(rule.headerRule, request);
      case 'percentage':
        return this.matchPercentageRule(rule.percentageRule, request);
      case 'ip':
        return this.matchIpRule(rule.ipRule, request);
      default:
        return false;
    }
  }

  private matchHeaderRule(
    headerRule: HeaderRule | undefined,
    request: Request,
  ): boolean {
    if (!headerRule) {
      return false;
    }

    const headerValue = request.headers[headerRule.header.toLowerCase()];
    if (!headerValue) {
      return false;
    }

    const actualValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    return this.evaluateCondition(actualValue, headerRule.operator, headerRule.value, headerRule.modValue);
  }

  private evaluateCondition(
    actual: string,
    operator: string,
    target: string,
    modValue?: number,
  ): boolean {
    const actualNum = Number(actual);
    const targetNum = Number(target);

    switch (operator.toLowerCase()) {
      case 'mod':
        if (modValue !== undefined && !isNaN(actualNum) && !isNaN(targetNum)) {
          return actualNum % modValue < targetNum;
        }
        return false;

      case 'eq':
      case '==':
        return actual === target;

      case 'neq':
      case '!=':
        return actual !== target;

      case 'gt':
      case '>':
        if (!isNaN(actualNum) && !isNaN(targetNum)) {
          return actualNum > targetNum;
        }
        return false;

      case 'gte':
      case '>=':
        if (!isNaN(actualNum) && !isNaN(targetNum)) {
          return actualNum >= targetNum;
        }
        return false;

      case 'lt':
      case '<':
        if (!isNaN(actualNum) && !isNaN(targetNum)) {
          return actualNum < targetNum;
        }
        return false;

      case 'lte':
      case '<=':
        if (!isNaN(actualNum) && !isNaN(targetNum)) {
          return actualNum <= targetNum;
        }
        return false;

      case 'contains':
        return actual.includes(target);

      case 'in':
        const values = target.split(',').map((v) => v.trim());
        return values.includes(actual);

      default:
        return false;
    }
  }

  private matchPercentageRule(
    percentageRule: PercentageRule | undefined,
    request: Request,
  ): boolean {
    if (!percentageRule) {
      return false;
    }

    const percentage = percentageRule.percentage;
    if (percentage <= 0) {
      return false;
    }
    if (percentage >= 100) {
      return true;
    }

    const random = Math.random() * 100;
    return random < percentage;
  }

  private matchIpRule(
    ipRule: IpWhitelistRule | undefined,
    request: Request,
  ): boolean {
    if (!ipRule || !ipRule.ips || ipRule.ips.length === 0) {
      return false;
    }

    const clientIp = this.getClientIp(request);
    return ipRule.ips.includes(clientIp);
  }

  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return req.ip || '127.0.0.1';
  }
}
