import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  getShopSyncStatus,
  pollBulkOperation,
  markSyncFailed,
} from "../../app/models/sync.server.js";

const SHOP = "test-store.myshopify.com";
const OP_ID = "gid://shopify/BulkOperation/500";

function getDb() {
  return global.__testPrisma || new PrismaClient();
}

/**
 * Mirrors the loader's poll-and-process branch (app/routes/app.sync.jsx lines 21-37).
 * Only covers the FAILED/CANCELED path — COMPLETED processing is out of scope.
 */
async function simulateLoaderPoll(admin, shop) {
  const syncStatus = await getShopSyncStatus(shop);

  if (
    (syncStatus.status === "running" || syncStatus.status === "completed") &&
    syncStatus.operationId
  ) {
    const opStatus = await pollBulkOperation(admin, syncStatus.operationId);
    if (opStatus.status === "FAILED" || opStatus.status === "CANCELED") {
      await markSyncFailed(shop);
    }
    return { syncStatus: await getShopSyncStatus(shop) };
  }

  return { syncStatus };
}

function mockAdmin(status) {
  return {
    graphql: vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: { node: { id: OP_ID, status, url: null } },
        }),
    }),
  };
}

describe("sync loader poll path", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
  });

  it("transitions shop from running to failed when bulk operation status is FAILED", async () => {
    await db.shop.create({
      data: { id: SHOP, syncStatus: "running", syncOperationId: OP_ID },
    });

    const admin = mockAdmin("FAILED");
    const result = await simulateLoaderPoll(admin, SHOP);

    expect(result.syncStatus.status).toBe("failed");

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("failed");
    expect(shop.syncOperationId).toBeNull();
  });

  it("transitions shop from running to failed when bulk operation status is CANCELED", async () => {
    await db.shop.create({
      data: { id: SHOP, syncStatus: "running", syncOperationId: OP_ID },
    });

    const admin = mockAdmin("CANCELED");
    const result = await simulateLoaderPoll(admin, SHOP);

    expect(result.syncStatus.status).toBe("failed");

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("failed");
    expect(shop.syncOperationId).toBeNull();
  });

  it("returns fresh status after marking failed, not stale running status", async () => {
    await db.shop.create({
      data: { id: SHOP, syncStatus: "running", syncOperationId: OP_ID },
    });

    const admin = mockAdmin("FAILED");
    const result = await simulateLoaderPoll(admin, SHOP);

    expect(result.syncStatus.status).toBe("failed");
    expect(result.syncStatus.operationId).toBeNull();
  });

  it("does not change status when bulk operation is still RUNNING", async () => {
    await db.shop.create({
      data: { id: SHOP, syncStatus: "running", syncOperationId: OP_ID },
    });

    const admin = mockAdmin("RUNNING");
    const result = await simulateLoaderPoll(admin, SHOP);

    expect(result.syncStatus.status).toBe("running");

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("running");
    expect(shop.syncOperationId).toBe(OP_ID);
  });

  it("preserves lastSyncAt when marking a re-sync as failed", async () => {
    const lastSync = new Date("2026-02-15T10:00:00Z");
    await db.shop.create({
      data: {
        id: SHOP,
        syncStatus: "running",
        syncOperationId: OP_ID,
        lastSyncAt: lastSync,
      },
    });

    const admin = mockAdmin("FAILED");
    await simulateLoaderPoll(admin, SHOP);

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("failed");
    expect(shop.lastSyncAt).toEqual(lastSync);
  });
});
