/*
  Warnings:

  - You are about to drop the column `ciry` on the `customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Customer` DROP COLUMN `ciry`,
    ADD COLUMN `city` VARCHAR(191) NULL;
