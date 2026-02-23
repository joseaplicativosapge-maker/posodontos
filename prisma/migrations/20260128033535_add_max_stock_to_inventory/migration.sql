/*
  Warnings:

  - Added the required column `maxStock` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `InventoryItem` ADD COLUMN `maxStock` DOUBLE NOT NULL;
