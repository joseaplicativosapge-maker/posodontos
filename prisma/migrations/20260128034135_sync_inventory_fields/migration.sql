/*
  Warnings:

  - The values [IN,OUT] on the enum `InventoryMovement_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `InventoryMovement` MODIFY `type` ENUM('ENTRADA', 'SALIDA') NOT NULL;
