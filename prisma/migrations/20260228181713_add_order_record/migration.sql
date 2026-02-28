-- CreateTable
CREATE TABLE "OrderRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL,
    "totalAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "financialStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "OrderRecord_shop_orderDate_idx" ON "OrderRecord"("shop", "orderDate");
