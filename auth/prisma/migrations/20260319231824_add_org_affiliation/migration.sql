-- CreateEnum
CREATE TYPE "Affiliation" AS ENUM ('police', 'fire', 'hospital', 'system');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "affiliation" "Affiliation" NOT NULL DEFAULT 'system';
