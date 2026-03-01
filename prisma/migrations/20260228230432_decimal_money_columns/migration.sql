/*
  Warnings:

  - You are about to alter the column `totalAmount` on the `OrderRecord` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `amount` on the `RefundRecord` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE "OrderRecord" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "RefundRecord" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);
