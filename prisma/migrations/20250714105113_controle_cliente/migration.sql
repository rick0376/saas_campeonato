/*
  Warnings:

  - The `status` column on the `Client` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED', 'TRIAL');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "features" TEXT,
ADD COLUMN     "logoPublicId" TEXT,
ADD COLUMN     "maxTeams" INTEGER DEFAULT 20,
ADD COLUMN     "maxUsers" INTEGER DEFAULT 10,
ADD COLUMN     "validDays" INTEGER,
DROP COLUMN "status",
ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE';
