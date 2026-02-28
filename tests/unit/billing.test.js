import { describe, test, expect } from "vitest";
import { hasFeatureAccess } from "../../app/models/billing.server.js";

describe("hasFeatureAccess", () => {
  test("Starter plan has access to dashboard", () => {
    expect(hasFeatureAccess("Starter", "dashboard")).toBe(true);
  });

  test("Starter plan has access to products", () => {
    expect(hasFeatureAccess("Starter", "products")).toBe(true);
  });

  test("Starter plan does NOT have access to returns", () => {
    expect(hasFeatureAccess("Starter", "returns")).toBe(false);
  });

  test("Pro plan has access to returns", () => {
    expect(hasFeatureAccess("Pro", "returns")).toBe(true);
  });

  test("Pro plan has access to all features", () => {
    expect(hasFeatureAccess("Pro", "dashboard")).toBe(true);
    expect(hasFeatureAccess("Pro", "products")).toBe(true);
    expect(hasFeatureAccess("Pro", "returns")).toBe(true);
    expect(hasFeatureAccess("Pro", "sync")).toBe(true);
    expect(hasFeatureAccess("Pro", "settings")).toBe(true);
  });

  test("null plan has no access", () => {
    expect(hasFeatureAccess(null, "dashboard")).toBe(false);
  });

  test("unknown plan has no access", () => {
    expect(hasFeatureAccess("Enterprise", "dashboard")).toBe(false);
  });

  test("unknown feature returns false", () => {
    expect(hasFeatureAccess("Pro", "unknown_feature")).toBe(false);
  });
});
