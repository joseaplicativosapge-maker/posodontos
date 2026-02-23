/*
  Warnings:

  - Added the required column `usageUnit` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `InventoryItem` ADD COLUMN `usageUnit` VARCHAR(191) NOT NULL;
