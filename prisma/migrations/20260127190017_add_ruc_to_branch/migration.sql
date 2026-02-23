/*
  Warnings:

  - Made the column `phone` on table `branch` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Branch` ADD COLUMN `businessHours` VARCHAR(191) NULL,
    ADD COLUMN `logoUrl` LONGTEXT NULL,
    ADD COLUMN `nit` VARCHAR(191) NULL,
    ADD COLUMN `ruc` VARCHAR(191) NULL,
    MODIFY `phone` VARCHAR(191) NOT NULL,
    ALTER COLUMN `isActive` DROP DEFAULT;
