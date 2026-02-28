import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getShopSyncStatus, markSyncFailed } from "../../app/models/sync.server.js";

const SHOP = "test-store.myshopify.com";

function getDb() {
  return global.__testPrisma || new PrismaClient();
}

describe("getShopSyncStatus", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
  });

  it("returns pending status for unknown shop", async () => {
    const result = await getShopSyncStatus("nonexistent.myshopify.com");
    expect(result).toEqual({
      status: "pending",
      lastSyncAt: null,
      operationId: null,
    });
  });

  it("returns correct status for existing shop", async () => {
    const lastSync = new Date("2026-02-15T10:00:00Z");
    await db.shop.create({
      data: {
        id: SHOP,
        currency: "USD",
        syncStatus: "completed",
        lastSyncAt: lastSync,
        syncOperationId: "gid://shopify/BulkOperation/123",
      },
    });

    const result = await getShopSyncStatus(SHOP);
    expect(result.status).toBe("completed");
    expect(result.lastSyncAt).toEqual(lastSync);
    expect(result.operationId).toBe("gid://shopify/BulkOperation/123");
  });

  it("returns running status during active sync", async () => {
    await db.shop.create({
      data: {
        id: SHOP,
        currency: "USD",
        syncStatus: "running",
        syncOperationId: "gid://shopify/BulkOperation/456",
      },
    });

    const result = await getShopSyncStatus(SHOP);
    expect(result.status).toBe("running");
    expect(result.operationId).toBe("gid://shopify/BulkOperation/456");
  });

  it("returns failed status after sync failure", async () => {
    await db.shop.create({
      data: {
        id: SHOP,
        currency: "USD",
        syncStatus: "failed",
      },
    });

    const result = await getShopSyncStatus(SHOP);
    expect(result.status).toBe("failed");
    expect(result.lastSyncAt).toBeNull();
  });
});

describe("markSyncFailed", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
  });

  it("sets syncStatus to failed and clears syncOperationId", async () => {
    await db.shop.create({
      data: {
        id: SHOP,
        currency: "USD",
        syncStatus: "running",
        syncOperationId: "gid://shopify/BulkOperation/789",
      },
    });

    await markSyncFailed(SHOP);

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("failed");
    expect(shop.syncOperationId).toBeNull();
  });

  it("preserves lastSyncAt from a previous successful sync", async () => {
    const lastSync = new Date("2026-02-10T10:00:00Z");
    await db.shop.create({
      data: {
        id: SHOP,
        currency: "USD",
        syncStatus: "running",
        syncOperationId: "gid://shopify/BulkOperation/789",
        lastSyncAt: lastSync,
      },
    });

    await markSyncFailed(SHOP);

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("failed");
    expect(shop.lastSyncAt).toEqual(lastSync);
  });
});
