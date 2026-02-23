-- AlterTable
ALTER TABLE `Product` ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `promotionType` VARCHAR(191) NULL,
    ADD COLUMN `promotionValue` DOUBLE NULL,
    ADD COLUMN `pucIncomeAccountId` VARCHAR(191) NULL,
    ADD COLUMN `taxType` VARCHAR(191) NULL;
