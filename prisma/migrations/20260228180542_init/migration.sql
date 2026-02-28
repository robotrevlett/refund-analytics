-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastSyncAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncOperationId" TEXT
);

-- CreateTable
CREATE TABLE "RefundRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "refundDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "note" TEXT,
    "reason" TEXT,
    "lineItems" TEXT NOT NULL,
    "hasReturn" BOOLEAN NOT NULL DEFAULT false,
    "returnId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReturnReasonRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "category" TEXT,
    "productTitle" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "RefundRecord_shop_refundDate_idx" ON "RefundRecord"("shop", "refundDate");

-- CreateIndex
CREATE INDEX "RefundRecord_shop_orderId_idx" ON "RefundRecord"("shop", "orderId");

-- CreateIndex
CREATE INDEX "ReturnReasonRecord_shop_createdAt_idx" ON "ReturnReasonRecord"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnReasonRecord_shop_reason_idx" ON "ReturnReasonRecord"("shop", "reason");
