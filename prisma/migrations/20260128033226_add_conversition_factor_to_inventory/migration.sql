/*
  Warnings:

  - Added the required column `conversionFactor` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `InventoryItem` ADD COLUMN `conversionFactor` DOUBLE NOT NULL;
