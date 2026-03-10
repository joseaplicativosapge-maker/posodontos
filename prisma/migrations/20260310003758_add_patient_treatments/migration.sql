-- CreateTable
CREATE TABLE `PatientTreatment` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `doctor` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    `totalCost` DOUBLE NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PatientTreatment_branchId_idx`(`branchId`),
    INDEX `PatientTreatment_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreatmentSession` (
    `id` VARCHAR(191) NOT NULL,
    `treatmentId` VARCHAR(191) NOT NULL,
    `sessionNumber` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NULL,
    `time` VARCHAR(191) NULL,
    `status` ENUM('PROGRAMADA', 'REALIZADA', 'CANCELADA', 'REPROGRAMADA') NOT NULL DEFAULT 'PROGRAMADA',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TreatmentSession_treatmentId_idx`(`treatmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PatientTreatment` ADD CONSTRAINT `PatientTreatment_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientTreatment` ADD CONSTRAINT `PatientTreatment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientTreatment` ADD CONSTRAINT `PatientTreatment_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentSession` ADD CONSTRAINT `TreatmentSession_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `PatientTreatment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
