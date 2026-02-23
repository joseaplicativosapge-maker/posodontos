-- CreateTable
CREATE TABLE `ComboItem` (
    `id` VARCHAR(191) NOT NULL,
    `parentProductId` VARCHAR(191) NOT NULL,
    `childProductId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `ComboItem_parentProductId_childProductId_key`(`parentProductId`, `childProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ComboItem` ADD CONSTRAINT `ComboItem_parentProductId_fkey` FOREIGN KEY (`parentProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComboItem` ADD CONSTRAINT `ComboItem_childProductId_fkey` FOREIGN KEY (`childProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
