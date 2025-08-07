/*
  Warnings:

  - Made the column `clientId` on table `Equipe` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Equipe" ALTER COLUMN "clientId" SET NOT NULL;
