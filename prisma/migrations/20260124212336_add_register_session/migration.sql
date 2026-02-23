-- CreateTable
CREATE TABLE `RegisterSession` (
    `id` VARCHAR(191) NOT NULL,
    `registerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `openingAmount` DOUBLE NOT NULL,
    `totalSales` DOUBLE NOT NULL DEFAULT 0,
    `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endTime` DATETIME(3) NULL,
    `isClosed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RegisterSession` ADD CONSTRAINT `RegisterSession_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `CashRegister`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegisterSession` ADD CONSTRAINT `RegisterSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
