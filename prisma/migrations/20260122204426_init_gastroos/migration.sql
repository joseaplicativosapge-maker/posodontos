-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `taxId` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'COP',
    `taxRate` DOUBLE NOT NULL DEFAULT 0.19,
    `impoconsumoRate` DOUBLE NOT NULL DEFAULT 0.08,
    `impoconsumoEnabled` BOOLEAN NOT NULL DEFAULT false,
    `modules` JSON NULL,

    UNIQUE INDEX `Company_taxId_key`(`taxId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Branch` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `Branch_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `pin` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_ADMIN', 'CASHIER', 'DRIVER', 'CHEF', 'GRILL_MASTER', 'WAITER', 'BARTENDER', 'ACCOUNTING_ADMIN') NOT NULL DEFAULT 'CASHIER',
    `companyId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountingAccount` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nature` ENUM('DEBITO', 'CREDITO') NOT NULL,
    `financialStatement` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AccountingAccount_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountingVoucher` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `type` ENUM('INGRESO', 'EGRESO', 'DIARIO') NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalDebit` DOUBLE NOT NULL,
    `totalCredit` DOUBLE NOT NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountingEntry` (
    `id` VARCHAR(191) NOT NULL,
    `voucherId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `debit` DOUBLE NOT NULL,
    `credit` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'und',
    `stock` DOUBLE NOT NULL DEFAULT 0,
    `minStock` DOUBLE NOT NULL DEFAULT 5,
    `cost` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryMovement` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `type` ENUM('IN', 'OUT') NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `previousStock` DOUBLE NOT NULL,
    `newStock` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `type` ENUM('VENTA_DIRECTA', 'PREPARADO', 'COMBO') NOT NULL DEFAULT 'PREPARADO',
    `productionArea` VARCHAR(191) NOT NULL DEFAULT 'COCINA',
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecipeItem` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `tableId` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'PENDING', 'PREPARING', 'READY', 'ON_WAY', 'DELIVERED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `type` ENUM('DINE_IN', 'TAKEAWAY', 'DELIVERY') NOT NULL DEFAULT 'TAKEAWAY',
    `paymentMethod` ENUM('CASH', 'CARD', 'QR', 'MIXED') NULL,
    `subtotal` DOUBLE NOT NULL,
    `tax` DOUBLE NOT NULL,
    `impoconsumoAmount` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `customerId` VARCHAR(191) NULL,
    `isSentToDIAN` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Table` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `seats` INTEGER NOT NULL DEFAULT 4,
    `status` ENUM('DISPONIBLE', 'OCUPADA', 'PENDIENTE_DE_PAGO', 'DESACTIVADA') NOT NULL DEFAULT 'DISPONIBLE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashRegister` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `documentType` VARCHAR(191) NULL,
    `documentNumber` VARCHAR(191) NULL,
    `points` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Customer_documentNumber_key`(`documentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `taxAmount` DOUBLE NOT NULL DEFAULT 0,
    `category` VARCHAR(191) NOT NULL,
    `type` ENUM('GASTO', 'COSTO') NOT NULL,
    `pucAccountId` VARCHAR(191) NOT NULL,
    `periodicity` VARCHAR(191) NOT NULL DEFAULT 'UNICO',
    `isExecuted` BOOLEAN NOT NULL DEFAULT false,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `taxId` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `total` DOUBLE NOT NULL,
    `status` ENUM('BORRADOR', 'APROBADA', 'PARTIAL', 'RECIBIDA', 'CERRADA', 'CANCELADA', 'RECHAZADA') NOT NULL DEFAULT 'BORRADOR',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receivedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `cost` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountingAccount` ADD CONSTRAINT `AccountingAccount_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountingVoucher` ADD CONSTRAINT `AccountingVoucher_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountingEntry` ADD CONSTRAINT `AccountingEntry_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `AccountingVoucher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountingEntry` ADD CONSTRAINT `AccountingEntry_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `AccountingAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeItem` ADD CONSTRAINT `RecipeItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeItem` ADD CONSTRAINT `RecipeItem_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `fk_order_table` FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `fk_order_customer` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Table` ADD CONSTRAINT `Table_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashRegister` ADD CONSTRAINT `CashRegister_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `fk_expense_supplier` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
