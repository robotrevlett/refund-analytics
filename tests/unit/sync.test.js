import { describe, it, expect } from "vitest";
import { parseJSONL } from "../../app/models/sync.server.js";

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
