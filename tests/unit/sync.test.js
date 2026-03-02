import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { parseJSONL, startBulkSync, mapReturnReason, saveReturnReasons } from "../../app/models/sync.server.js";

const SHOP = "sync-test-store.myshopify.com";

function getDb() {
  return global.__testPrisma || new PrismaClient();
}

describe("parseJSONL", () => {
  it("parses valid JSONL with parent-child relationships", () => {
    const jsonl = [
      JSON.stringify({ id: "gid://shopify/Order/1", name: "#1001", createdAt: "2025-01-01T00:00:00Z" }),
      JSON.stringify({ id: "gid://shopify/Refund/1", createdAt: "2025-01-15T00:00:00Z", __parentId: "gid://shopify/Order/1" }),
      JSON.stringify({ id: "gid://shopify/Order/2", name: "#1002", createdAt: "2025-01-02T00:00:00Z" }),
    ].join("\n");

    const records = parseJSONL(jsonl);

    expect(records).toHaveLength(3);

    const order1 = records.find((r) => r.id === "gid://shopify/Order/1");
    expect(order1).toBeDefined();
    expect(order1._children).toHaveLength(1);
    expect(order1._children[0].id).toBe("gid://shopify/Refund/1");
  });

  it("handles empty input", () => {
    expect(parseJSONL("")).toEqual([]);
    expect(parseJSONL("  ")).toEqual([]);
    expect(parseJSONL(null)).toEqual([]);
    expect(parseJSONL(undefined)).toEqual([]);
  });

  it("skips malformed lines gracefully", () => {
    const jsonl = [
      JSON.stringify({ id: "gid://shopify/Order/1", name: "#1001" }),
      "this is not valid json",
      JSON.stringify({ id: "gid://shopify/Order/2", name: "#1002" }),
    ].join("\n");

    const records = parseJSONL(jsonl);
    expect(records).toHaveLength(2);
  });

  it("skips lines without an id", () => {
    const jsonl = [
      JSON.stringify({ id: "gid://shopify/Order/1", name: "#1001" }),
      JSON.stringify({ name: "no-id-record" }),
    ].join("\n");

    const records = parseJSONL(jsonl);
    expect(records).toHaveLength(1);
  });

  it("handles empty lines between records", () => {
    const jsonl = [
      JSON.stringify({ id: "gid://shopify/Order/1", name: "#1001" }),
      "",
      "",
      JSON.stringify({ id: "gid://shopify/Order/2", name: "#1002" }),
    ].join("\n");

    const records = parseJSONL(jsonl);
    expect(records).toHaveLength(2);
  });

  it("links multiple children to the same parent", () => {
    const jsonl = [
      JSON.stringify({ id: "gid://shopify/Order/1", name: "#1001" }),
      JSON.stringify({ id: "gid://shopify/Refund/1", __parentId: "gid://shopify/Order/1" }),
      JSON.stringify({ id: "gid://shopify/Refund/2", __parentId: "gid://shopify/Order/1" }),
    ].join("\n");

    const records = parseJSONL(jsonl);
    const order = records.find((r) => r.id === "gid://shopify/Order/1");
    expect(order._children).toHaveLength(2);
  });

  it("handles orphaned children (parent not yet seen)", () => {
    const jsonl = [
      JSON.stringify({ id: "gid://shopify/Refund/1", __parentId: "gid://shopify/Order/999" }),
      JSON.stringify({ id: "gid://shopify/Order/1", name: "#1001" }),
    ].join("\n");

    // Orphaned child should still be in the records, just without parent linkage
    const records = parseJSONL(jsonl);
    expect(records).toHaveLength(2);
  });
});

describe("startBulkSync", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
  });

  it("returns early if sync is already running", async () => {
    // Set up a shop with syncStatus "running"
    await db.shop.create({
      data: {
        id: SHOP,
        currency: "USD",
        syncStatus: "running",
        syncOperationId: "gid://shopify/BulkOperation/111",
      },
    });

    // admin mock should never be called
    const admin = {
      graphql: () => {
        throw new Error("graphql should not be called when sync is already running");
      },
    };

    const result = await startBulkSync(admin, SHOP);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe("Sync already in progress");

    // Verify the existing operation ID was not overwritten
    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncOperationId).toBe("gid://shopify/BulkOperation/111");
  });

  it("allows sync to start when status is not running", async () => {
    await db.shop.create({
      data: {
        id: SHOP,
        currency: "USD",
        syncStatus: "completed",
      },
    });

    const admin = {
      graphql: async () => ({
        json: async () => ({
          data: {
            bulkOperationRunQuery: {
              bulkOperation: { id: "gid://shopify/BulkOperation/222", status: "CREATED" },
              userErrors: [],
            },
          },
        }),
      }),
    };

    const result = await startBulkSync(admin, SHOP);

    expect(result.success).toBe(true);
    expect(result.operationId).toBe("gid://shopify/BulkOperation/222");

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("running");
    expect(shop.syncOperationId).toBe("gid://shopify/BulkOperation/222");
  });

  it("allows sync to start for a new shop", async () => {
    const newShop = "brand-new-store.myshopify.com";
    const admin = {
      graphql: async () => ({
        json: async () => ({
          data: {
            bulkOperationRunQuery: {
              bulkOperation: { id: "gid://shopify/BulkOperation/333", status: "CREATED" },
              userErrors: [],
            },
          },
        }),
      }),
    };

    const result = await startBulkSync(admin, newShop);

    expect(result.success).toBe(true);

    const shop = await db.shop.findUnique({ where: { id: newShop } });
    expect(shop.syncStatus).toBe("running");
  });
});

describe("mapReturnReason", () => {
  it("maps known sizing handle to Sizing category", () => {
    const result = mapReturnReason({ handle: "too-small", name: "Too small" });
    expect(result).toEqual({ label: "Too small", category: "Sizing" });
  });

  it("maps known quality handle to Quality category", () => {
    const result = mapReturnReason({ handle: "defective", name: "Defective" });
    expect(result).toEqual({ label: "Defective", category: "Quality" });
  });

  it("maps known preference handle to Preference category", () => {
    const result = mapReturnReason({ handle: "unwanted", name: "Unwanted" });
    expect(result).toEqual({ label: "Unwanted", category: "Preference" });
  });

  it("maps known accuracy handle to Accuracy category", () => {
    const result = mapReturnReason({ handle: "not-as-described", name: "Not as described" });
    expect(result).toEqual({ label: "Not as described", category: "Accuracy" });
  });

  it("maps unknown handle to Other category with API-provided name", () => {
    const result = mapReturnReason({ handle: "future-new-reason", name: "Some future reason" });
    expect(result).toEqual({ label: "Some future reason", category: "Other" });
  });

  it("maps null definition to Unknown label and Other category", () => {
    const result = mapReturnReason(null);
    expect(result).toEqual({ label: "Unknown", category: "Other" });
  });

  it("maps undefined definition to Unknown label and Other category", () => {
    const result = mapReturnReason(undefined);
    expect(result).toEqual({ label: "Unknown", category: "Other" });
  });
});

describe("saveReturnReasons", () => {
  const RETURN_SHOP = "return-reason-test.myshopify.com";
  let db;

  beforeEach(async () => {
    db = getDb();
    await db.shop.create({
      data: { id: RETURN_SHOP, currency: "USD", syncStatus: "completed" },
    });
  });

  it("saves return reasons from new API shape with handle and name", async () => {
    const returnDetails = [
      {
        id: "gid://shopify/Return/1",
        createdAt: "2026-01-15T00:00:00Z",
        order: { id: "gid://shopify/Order/100" },
        returnLineItems: {
          edges: [
            {
              node: {
                id: "gid://shopify/ReturnLineItem/1",
                quantity: 2,
                returnReasonDefinition: { handle: "too-small", name: "Too small" },
                returnReasonNote: "Runs small",
                customerNote: null,
                lineItem: { title: "Classic T-Shirt", sku: "TSHIRT-M" },
              },
            },
          ],
        },
      },
    ];

    await saveReturnReasons(RETURN_SHOP, returnDetails);

    const record = await db.returnReasonRecord.findUnique({
      where: { id: "gid://shopify/ReturnLineItem/1" },
    });

    expect(record).toBeDefined();
    expect(record.reason).toBe("Too small");
    expect(record.category).toBe("Sizing");
    expect(record.quantity).toBe(2);
    expect(record.productTitle).toBe("Classic T-Shirt");
    expect(record.sku).toBe("TSHIRT-M");
  });

  it("handles return with empty returnLineItems edges", async () => {
    const returnDetails = [
      {
        id: "gid://shopify/Return/2",
        createdAt: "2026-01-15T00:00:00Z",
        order: { id: "gid://shopify/Order/200" },
        returnLineItems: { edges: [] },
      },
    ];

    await saveReturnReasons(RETURN_SHOP, returnDetails);

    const count = await db.returnReasonRecord.count({
      where: { shop: RETURN_SHOP },
    });
    expect(count).toBe(0);
  });

  it("handles return with null returnLineItems", async () => {
    const returnDetails = [
      {
        id: "gid://shopify/Return/3",
        createdAt: "2026-01-15T00:00:00Z",
        order: { id: "gid://shopify/Order/300" },
        returnLineItems: null,
      },
    ];

    // Should not throw
    await saveReturnReasons(RETURN_SHOP, returnDetails);

    const count = await db.returnReasonRecord.count({
      where: { shop: RETURN_SHOP },
    });
    expect(count).toBe(0);
  });

  it("maps null returnReasonDefinition to Unknown/Other", async () => {
    const returnDetails = [
      {
        id: "gid://shopify/Return/4",
        createdAt: "2026-01-15T00:00:00Z",
        order: { id: "gid://shopify/Order/400" },
        returnLineItems: {
          edges: [
            {
              node: {
                id: "gid://shopify/ReturnLineItem/4",
                quantity: 1,
                returnReasonDefinition: null,
                returnReasonNote: null,
                customerNote: null,
                lineItem: { title: "Mystery Item", sku: null },
              },
            },
          ],
        },
      },
    ];

    await saveReturnReasons(RETURN_SHOP, returnDetails);

    const record = await db.returnReasonRecord.findUnique({
      where: { id: "gid://shopify/ReturnLineItem/4" },
    });

    expect(record.reason).toBe("Unknown");
    expect(record.category).toBe("Other");
  });
});
