-- AlterTable
ALTER TABLE `CashRegister` ADD COLUMN `currentUserId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `CashRegister` ADD CONSTRAINT `CashRegister_currentUserId_fkey` FOREIGN KEY (`currentUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
