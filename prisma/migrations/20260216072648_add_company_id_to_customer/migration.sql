-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `companyId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
