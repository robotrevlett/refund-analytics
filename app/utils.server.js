import db from "./db.server.js";

/**
 * Parse and validate the "days" query parameter.
 * Returns a safe integer between 1 and 365, defaulting to 30.
 */
export function parseDays(searchParams) {
  const raw = searchParams.get("days");
  if (!raw) return 30;
  const days = parseInt(raw, 10);
  if (isNaN(days) || days < 1) return 30;
  return Math.min(days, 365);
}

/**
 * Get a Date representing N days ago at midnight UTC.
 */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the shop's currency from the DB, falling back to "USD".
 */
export async function getShopCurrency(shop) {
  const shopRecord = await db.shop.findUnique({
    where: { id: shop },
    select: { currency: true },
  });
  return shopRecord?.currency || "USD";
}
