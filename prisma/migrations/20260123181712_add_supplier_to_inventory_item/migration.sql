-- AlterTable
ALTER TABLE `InventoryItem` ADD COLUMN `supplierId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
