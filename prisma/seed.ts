import { PrismaClient, LoadBalanceStrategy, AuthType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  await prisma.route.deleteMany();
  await prisma.serviceInstance.deleteMany();
  await prisma.rateLimitRule.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.requestLog.deleteMany();
  await prisma.circuitBreaker.deleteMany();
  await prisma.service.deleteMany();

  const userService = await prisma.service.create({
    data: {
      name: 'user-service',
      description: '用户服务，处理用户相关业务',
      baseUrl: 'http://localhost:8081',
      healthCheckPath: '/health',
      timeout: 5000,
      enabled: true,
      loadBalanceStrategy: LoadBalanceStrategy.ROUND_ROBIN,
    },
  });

  await prisma.serviceInstance.createMany({
    data: [
      {
        serviceId: userService.id,
        url: 'http://localhost:8081',
        healthy: true,
      },
      {
        serviceId: userService.id,
        url: 'http://localhost:8082',
        healthy: true,
      },
    ],
  });

  const productService = await prisma.service.create({
    data: {
      name: 'product-service',
      description: '产品服务，处理产品相关业务',
      baseUrl: 'http://localhost:8083',
      healthCheckPath: '/health',
      timeout: 5000,
      enabled: true,
      loadBalanceStrategy: LoadBalanceStrategy.ROUND_ROBIN,
    },
  });

  await prisma.serviceInstance.create({
    data: {
      serviceId: productService.id,
      url: 'http://localhost:8083',
      healthy: true,
    },
  });

  const orderService = await prisma.service.create({
    data: {
      name: 'order-service',
      description: '订单服务，处理订单相关业务',
      baseUrl: 'http://localhost:8084',
      healthCheckPath: '/health',
      timeout: 5000,
      enabled: true,
      loadBalanceStrategy: LoadBalanceStrategy.RANDOM,
    },
  });

  await prisma.serviceInstance.createMany({
    data: [
      {
        serviceId: orderService.id,
        url: 'http://localhost:8084',
        healthy: true,
      },
      {
        serviceId: orderService.id,
        url: 'http://localhost:8085',
        healthy: true,
      },
      {
        serviceId: orderService.id,
        url: 'http://localhost:8086',
        healthy: true,
      },
    ],
  });

  await prisma.route.createMany({
    data: [
      {
        serviceId: userService.id,
        path: '/api/users/*',
        method: '*',
        rewritePath: '/*',
        authType: AuthType.JWT,
        enabled: true,
      },
      {
        serviceId: productService.id,
        path: '/api/products/*',
        method: '*',
        rewritePath: '/*',
        authType: AuthType.NONE,
        enabled: true,
      },
      {
        serviceId: orderService.id,
        path: '/api/orders/*',
        method: '*',
        rewritePath: '/*',
        authType: AuthType.API_KEY,
        enabled: true,
        extraHeaders: {
          'X-Gateway-Id': 'zj-60076-gateway',
        },
      },
      {
        serviceId: userService.id,
        path: '/api/auth/*',
        method: '*',
        rewritePath: '/*',
        authType: AuthType.NONE,
        enabled: true,
      },
    ],
  });

  await prisma.rateLimitRule.createMany({
    data: [
      {
        path: '/api/users/*',
        method: '*',
        dimension: 'ip',
        limitPerSecond: 10,
        limitPerMinute: 100,
        limitPerHour: 1000,
        enabled: true,
      },
      {
        path: '/api/orders/*',
        method: 'POST',
        dimension: 'user',
        limitPerSecond: 2,
        limitPerMinute: 20,
        limitPerHour: 200,
        enabled: true,
      },
      {
        path: '/api/auth/login',
        method: 'POST',
        dimension: 'ip',
        limitPerSecond: 5,
        limitPerMinute: 30,
        limitPerHour: 100,
        enabled: true,
      },
    ],
  });

  await prisma.apiKey.createMany({
    data: [
      {
        key: `apikey_${uuidv4().replace(/-/g, '')}`,
        name: 'Test API Key 1',
        userId: 'user-001',
        enabled: true,
      },
      {
        key: `apikey_${uuidv4().replace(/-/g, '')}`,
        name: 'Test API Key 2',
        userId: 'user-002',
        enabled: true,
      },
    ],
  });

  console.log('Seeding completed!');
  console.log('\nCreated services:');
  console.log('  - user-service (2 instances, ROUND_ROBIN)');
  console.log('  - product-service (1 instance, ROUND_ROBIN)');
  console.log('  - order-service (3 instances, RANDOM)');
  console.log('\nCreated routes:');
  console.log('  - /api/users/* -> user-service (JWT auth)');
  console.log('  - /api/products/* -> product-service (No auth)');
  console.log('  - /api/orders/* -> order-service (API Key auth)');
  console.log('  - /api/auth/* -> user-service (No auth)');
  console.log('\nCreated rate limit rules:');
  console.log('  - /api/users/*: 10 req/s, 100 req/min, 1000 req/h (by IP)');
  console.log('  - POST /api/orders/*: 2 req/s, 20 req/min, 200 req/h (by User)');
  console.log('  - POST /api/auth/login: 5 req/s, 30 req/min, 100 req/h (by IP)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
