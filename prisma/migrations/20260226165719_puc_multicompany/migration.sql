/*
  Warnings:

  - A unique constraint covering the columns `[code,companyId]` on the table `AccountingAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `AccountingAccount_code_key` ON `AccountingAccount`;

-- CreateIndex
CREATE UNIQUE INDEX `AccountingAccount_code_companyId_key` ON `AccountingAccount`(`code`, `companyId`);
