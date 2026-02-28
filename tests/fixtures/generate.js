/**
 * Test fixture generator for Refund & Return Analytics
 *
 * Generates realistic test data:
 * - 50 orders spanning 90 days
 * - 15 orders with refunds (30% rate)
 * - 10 returns with structured reasons
 * - 12 products across 3 categories
 * - Edge cases: refund date != order date, $0 restocks, multi-refunds
 */

const PRODUCTS = [
  // Apparel (high return rate)
  { title: "Classic Cotton T-Shirt", sku: "APP-TSH-001", price: 29.99, category: "Apparel" },
  { title: "Slim Fit Jeans", sku: "APP-JNS-002", price: 79.99, category: "Apparel" },
  { title: "Winter Puffer Jacket", sku: "APP-JKT-003", price: 149.99, category: "Apparel" },
  { title: "Running Sneakers", sku: "APP-SNK-004", price: 119.99, category: "Apparel" },
  // Electronics
  { title: "Wireless Earbuds", sku: "ELC-EAR-001", price: 59.99, category: "Electronics" },
  { title: "Phone Case - Clear", sku: "ELC-CAS-002", price: 19.99, category: "Electronics" },
  { title: "USB-C Hub Adapter", sku: "ELC-HUB-003", price: 39.99, category: "Electronics" },
  { title: "Portable Charger 10000mAh", sku: "ELC-CHG-004", price: 34.99, category: "Electronics" },
  // Home
  { title: "Scented Candle Set", sku: "HOM-CND-001", price: 24.99, category: "Home" },
  { title: "Throw Blanket - Wool", sku: "HOM-BLK-002", price: 69.99, category: "Home" },
  { title: "Ceramic Mug Set (4)", sku: "HOM-MUG-003", price: 44.99, category: "Home" },
  { title: "Wall Art Print", sku: "HOM-ART-004", price: 54.99, category: "Home" },
];

const RETURN_REASONS = [
  { reason: "Sizing too small", category: "Sizing" },
  { reason: "Sizing too small", category: "Sizing" },
  { reason: "Sizing too small", category: "Sizing" },
  { reason: "Sizing too large", category: "Sizing" },
  { reason: "Sizing too large", category: "Sizing" },
  { reason: "Not as described", category: "Accuracy" },
  { reason: "Not as described", category: "Accuracy" },
  { reason: "Defective / damaged", category: "Quality" },
  { reason: "Defective / damaged", category: "Quality" },
  { reason: "Changed mind", category: "Preference" },
];

const SHOP = "test-store.myshopify.com";

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

function randomItems(minCount = 1, maxCount = 4) {
  const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((p) => ({
    ...p,
    quantity: 1 + Math.floor(Math.random() * 3),
  }));
}

function generateOrders() {
  const orders = [];

  for (let i = 1; i <= 50; i++) {
    const orderDate = randomDate(90);
    const items = randomItems();
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    orders.push({
      id: `gid://shopify/Order/${1000 + i}`,
      name: `#${1000 + i}`,
      createdAt: orderDate.toISOString(),
      totalPriceSet: {
        shopMoney: { amount: total.toFixed(2), currencyCode: "USD" },
      },
      displayFinancialStatus: "PAID",
      customer: {
        id: `gid://shopify/Customer/${2000 + i}`,
        displayName: `Customer ${i}`,
        email: `customer${i}@example.com`,
      },
      items,
    });
  }

  return orders;
}

function generateRefunds(orders) {
  const refunds = [];
  const refundableOrders = orders.slice(0, 15); // First 15 orders get refunds

  for (let i = 0; i < refundableOrders.length; i++) {
    const order = refundableOrders[i];
    const orderDate = new Date(order.createdAt);

    // Refund date is 7-30 days after order date (key differentiator)
    const refundDate = new Date(orderDate);
    refundDate.setDate(refundDate.getDate() + 7 + Math.floor(Math.random() * 23));

    if (i < 5) {
      // Full refunds (orders 0-4)
      const amount = parseFloat(order.totalPriceSet.shopMoney.amount);
      refunds.push({
        id: `gid://shopify/Refund/${3000 + i}`,
        orderId: order.id,
        orderName: order.name,
        createdAt: refundDate.toISOString(),
        totalRefundedSet: {
          shopMoney: { amount: amount.toFixed(2), currencyCode: "USD" },
        },
        note: "Full refund — customer request",
        lineItems: order.items.map((item) => ({
          sku: item.sku,
          title: item.title,
          quantity: item.quantity,
          amount: item.price * item.quantity,
        })),
        hasReturn: i < 3, // First 3 have linked returns
        returnId: i < 3 ? `gid://shopify/Return/${4000 + i}` : null,
      });
    } else if (i < 12) {
      // Partial refunds (orders 5-11): 1-2 items out of the order
      const refundItems = order.items.slice(0, Math.min(2, order.items.length));
      const amount = refundItems.reduce((sum, item) => sum + item.price * 1, 0); // qty 1 each
      refunds.push({
        id: `gid://shopify/Refund/${3000 + i}`,
        orderId: order.id,
        orderName: order.name,
        createdAt: refundDate.toISOString(),
        totalRefundedSet: {
          shopMoney: { amount: amount.toFixed(2), currencyCode: "USD" },
        },
        note: "Partial refund",
        lineItems: refundItems.map((item) => ({
          sku: item.sku,
          title: item.title,
          quantity: 1,
          amount: item.price,
        })),
        hasReturn: i < 10,
        returnId: i < 10 ? `gid://shopify/Return/${4000 + i}` : null,
      });
    } else {
      // Multi-refund orders (orders 12-14): two refunds on same order
      const firstItems = order.items.slice(0, 1);
      const secondItems = order.items.slice(1, 2);

      refunds.push({
        id: `gid://shopify/Refund/${3000 + i}`,
        orderId: order.id,
        orderName: order.name,
        createdAt: refundDate.toISOString(),
        totalRefundedSet: {
          shopMoney: { amount: firstItems[0].price.toFixed(2), currencyCode: "USD" },
        },
        note: "First partial refund",
        lineItems: firstItems.map((item) => ({
          sku: item.sku,
          title: item.title,
          quantity: 1,
          amount: item.price,
        })),
        hasReturn: false,
        returnId: null,
      });

      if (secondItems.length > 0) {
        const secondDate = new Date(refundDate);
        secondDate.setDate(secondDate.getDate() + 5);

        refunds.push({
          id: `gid://shopify/Refund/${3100 + i}`,
          orderId: order.id,
          orderName: order.name,
          createdAt: secondDate.toISOString(),
          totalRefundedSet: {
            shopMoney: { amount: secondItems[0].price.toFixed(2), currencyCode: "USD" },
          },
          note: "Second partial refund",
          lineItems: secondItems.map((item) => ({
            sku: item.sku,
            title: item.title,
            quantity: 1,
            amount: item.price,
          })),
          hasReturn: false,
          returnId: null,
        });
      }
    }
  }

  // Edge case: $0 refund (restock only)
  refunds.push({
    id: "gid://shopify/Refund/3099",
    orderId: orders[15].id,
    orderName: orders[15].name,
    createdAt: new Date().toISOString(),
    totalRefundedSet: { shopMoney: { amount: "0.00", currencyCode: "USD" } },
    note: "Restock only — no monetary refund",
    lineItems: [{
      sku: orders[15].items[0].sku,
      title: orders[15].items[0].title,
      quantity: 1,
      amount: 0,
    }],
    hasReturn: true,
    returnId: "gid://shopify/Return/4099",
  });

  return refunds;
}

function generateReturnReasons(refunds) {
  const returnsWithReasons = refunds.filter((r) => r.hasReturn && r.returnId);
  return returnsWithReasons.map((refund, i) => {
    const reasonData = RETURN_REASONS[i % RETURN_REASONS.length];
    const lineItem = refund.lineItems[0];
    return {
      id: `gid://shopify/ReturnLineItem/${5000 + i}`,
      shop: SHOP,
      returnId: refund.returnId,
      orderId: refund.orderId,
      reason: reasonData.reason,
      category: reasonData.category,
      productTitle: lineItem.title,
      sku: lineItem.sku,
      quantity: lineItem.quantity,
      createdAt: refund.createdAt,
    };
  });
}

function generateBulkJSONL(orders, refunds) {
  const lines = [];

  for (const order of orders) {
    const orderRefunds = refunds.filter((r) => r.orderId === order.id);
    lines.push(JSON.stringify({
      id: order.id,
      name: order.name,
      createdAt: order.createdAt,
      totalPriceSet: order.totalPriceSet,
      displayFinancialStatus: order.displayFinancialStatus,
      customer: order.customer,
    }));

    for (const refund of orderRefunds) {
      lines.push(JSON.stringify({
        id: refund.id,
        createdAt: refund.createdAt,
        note: refund.note,
        totalRefundedSet: refund.totalRefundedSet,
        __parentId: order.id,
      }));
    }
  }

  return lines.join("\n");
}

// Generate all fixtures
const orders = generateOrders();
const refunds = generateRefunds(orders);
const returnReasons = generateReturnReasons(refunds);
const bulkJSONL = generateBulkJSONL(orders, refunds);

const fixtures = { orders, refunds, returnReasons, bulkJSONL, shop: SHOP };

// Export for use in tests
export { orders, refunds, returnReasons, bulkJSONL, SHOP, PRODUCTS, RETURN_REASONS };
export default fixtures;

// Write to files if run directly
if (process.argv[1] && process.argv[1].endsWith("generate.js")) {
  const { writeFileSync } = await import("fs");
  const { dirname, join } = await import("path");
  const { fileURLToPath } = await import("url");

  const __dirname = dirname(fileURLToPath(import.meta.url));

  writeFileSync(join(__dirname, "orders.json"), JSON.stringify(orders, null, 2));
  writeFileSync(join(__dirname, "refunds.json"), JSON.stringify(refunds, null, 2));
  writeFileSync(join(__dirname, "returns.json"), JSON.stringify(returnReasons, null, 2));
  writeFileSync(join(__dirname, "bulk-operation.jsonl"), bulkJSONL);

  console.log(`Generated fixtures:`);
  console.log(`  ${orders.length} orders`);
  console.log(`  ${refunds.length} refunds`);
  console.log(`  ${returnReasons.length} return reasons`);
  console.log(`  ${bulkJSONL.split("\n").length} JSONL lines`);
}
