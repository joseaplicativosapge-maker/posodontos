/*
  Warnings:

  - Added the required column `companyId` to the `Supplier` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Supplier` ADD COLUMN `companyId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
