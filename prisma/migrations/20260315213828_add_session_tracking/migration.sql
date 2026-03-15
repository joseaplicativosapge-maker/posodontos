-- AlterTable
ALTER TABLE `TreatmentSession` ADD COLUMN `trackingNotes` TEXT NULL,
    ADD COLUMN `trackingOdontogram` JSON NULL,
    ADD COLUMN `trackingPhotos` JSON NULL,
    ADD COLUMN `trackingUpdatedAt` DATETIME(3) NULL,
    ADD COLUMN `trackingUpdatedBy` VARCHAR(191) NULL;
