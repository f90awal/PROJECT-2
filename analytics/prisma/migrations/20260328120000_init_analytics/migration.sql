-- CreateEnum
CREATE TYPE "EmergencyService" AS ENUM ('ambulance', 'fire', 'police');

-- CreateTable
CREATE TABLE "IncidentFact" (
  "id" SERIAL NOT NULL,
  "incidentId" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "incidentType" TEXT NOT NULL,
  "status" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "dispatchedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchFact" (
  "id" SERIAL NOT NULL,
  "dispatchId" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "emergencyService" "EmergencyService" NOT NULL,
  "responderId" TEXT,
  "responderName" TEXT,
  "region" TEXT,
  "dispatchedAt" TIMESTAMP(3) NOT NULL,
  "arrivedAt" TIMESTAMP(3),
  "clearedAt" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DispatchFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalCapacityFact" (
  "id" SERIAL NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "hospitalName" TEXT,
  "region" TEXT,
  "totalBeds" INTEGER NOT NULL,
  "availableBeds" INTEGER NOT NULL,
  "totalAmbulances" INTEGER,
  "availableAmbulances" INTEGER,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HospitalCapacityFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncidentFact_incidentId_key" ON "IncidentFact"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentFact_createdAt_idx" ON "IncidentFact"("createdAt");

-- CreateIndex
CREATE INDEX "IncidentFact_region_incidentType_idx" ON "IncidentFact"("region", "incidentType");

-- CreateIndex
CREATE INDEX "IncidentFact_status_idx" ON "IncidentFact"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchFact_dispatchId_key" ON "DispatchFact"("dispatchId");

-- CreateIndex
CREATE INDEX "DispatchFact_incidentId_idx" ON "DispatchFact"("incidentId");

-- CreateIndex
CREATE INDEX "DispatchFact_dispatchedAt_idx" ON "DispatchFact"("dispatchedAt");

-- CreateIndex
CREATE INDEX "DispatchFact_emergencyService_responderId_idx" ON "DispatchFact"("emergencyService", "responderId");

-- CreateIndex
CREATE INDEX "HospitalCapacityFact_capturedAt_idx" ON "HospitalCapacityFact"("capturedAt");

-- CreateIndex
CREATE INDEX "HospitalCapacityFact_hospitalId_capturedAt_idx" ON "HospitalCapacityFact"("hospitalId", "capturedAt");

-- CreateIndex
CREATE INDEX "HospitalCapacityFact_region_idx" ON "HospitalCapacityFact"("region");