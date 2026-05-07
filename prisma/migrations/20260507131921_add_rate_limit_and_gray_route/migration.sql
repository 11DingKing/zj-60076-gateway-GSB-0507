-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "grayRules" JSONB,
ADD COLUMN     "grayUpstream" TEXT,
ADD COLUMN     "rateLimitQps" INTEGER;

-- CreateTable
CREATE TABLE "tenant_rate_limits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "qpsLimit" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_rate_limits" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "qpsLimit" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_rate_limits_tenantId_key" ON "tenant_rate_limits"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ip_rate_limits_ip_key" ON "ip_rate_limits"("ip");
