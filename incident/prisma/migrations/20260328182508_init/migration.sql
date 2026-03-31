-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('created', 'dispatched', 'in_progress', 'resolved', 'cancelled');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'published', 'failed');

-- CreateTable
CREATE TABLE "Incident" (
    "id" SERIAL NOT NULL,
    "type" JSONB NOT NULL,
    "description" TEXT,
    "location" JSONB NOT NULL,
    "priority" JSONB NOT NULL,
    "metadata" JSONB,
    "status" "Status" NOT NULL DEFAULT 'created',
    "reporterId" TEXT,
    "operatorId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dispatchedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" SERIAL NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttempt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Outbox_status_createdAt_idx" ON "Outbox"("status", "createdAt");
