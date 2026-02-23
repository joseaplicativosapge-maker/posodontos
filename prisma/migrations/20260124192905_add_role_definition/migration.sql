-- CreateTable
CREATE TABLE `RoleDefinition` (
    `role` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `permissions` JSON NOT NULL,

    PRIMARY KEY (`role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
