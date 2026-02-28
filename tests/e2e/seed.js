import { PrismaClient } from "@prisma/client";

const SHOP = "test-store.myshopify.com";

export async function seedE2EData() {
  const db = new PrismaClient();

  try {
    // Clean existing data
    await db.returnReasonRecord.deleteMany();
    await db.refundRecord.deleteMany();
    await db.orderRecord.deleteMany();
    await db.shop.deleteMany();
    await db.session.deleteMany();

    // Create shop
    await db.shop.create({
      data: {
        id: SHOP,
        currency: "USD",
        syncStatus: "completed",
        lastSyncAt: new Date(),
      },
    });

    // Create a test session (needed for auth)
    await db.session.create({
      data: {
        id: `offline_${SHOP}`,
        shop: SHOP,
        state: "active",
        isOnline: false,
        accessToken: "test-token",
      },
    });

    const now = new Date();

    // Seed orders
    const orders = [];
    for (let i = 1; i <= 20; i++) {
      orders.push({
        id: `gid://shopify/Order/${i}`,
        shop: SHOP,
        name: `#100${i}`,
        orderDate: new Date(now.getTime() - i * 3 * 24 * 60 * 60 * 1000),
        totalAmount: 50 + Math.random() * 200,
        currency: "USD",
        financialStatus: i <= 5 ? "PARTIALLY_REFUNDED" : "PAID",
      });
    }
    for (const order of orders) {
      await db.orderRecord.create({ data: order });
    }

    // Seed refunds
    const products = [
      { sku: "APP-TSH-001", title: "Classic Cotton T-Shirt" },
      { sku: "APP-JNS-002", title: "Slim Fit Jeans" },
      { sku: "APP-JKT-003", title: "Winter Puffer Jacket" },
      { sku: "ELC-EAR-001", title: "Wireless Earbuds" },
    ];

    const reasons = ["customer", "damage", "other"];

    for (let i = 1; i <= 8; i++) {
      const product = products[i % products.length];
      await db.refundRecord.create({
        data: {
          id: `gid://shopify/Refund/${i}`,
          shop: SHOP,
          orderId: `gid://shopify/Order/${i}`,
          orderName: `#100${i}`,
          refundDate: new Date(now.getTime() - i * 4 * 24 * 60 * 60 * 1000),
          amount: 20 + Math.random() * 80,
          currency: "USD",
          note: `Refund for order #100${i}`,
          reason: reasons[i % reasons.length],
          lineItems: JSON.stringify([
            {
              sku: product.sku,
              title: product.title,
              quantity: 1,
              amount: 20 + Math.random() * 80,
            },
          ]),
          hasReturn: i <= 4,
          returnId: i <= 4 ? `gid://shopify/Return/${i}` : null,
        },
      });
    }

    // Seed return reasons
    const returnReasons = [
      { reason: "Size too small", category: "Sizing" },
      { reason: "Damaged or defective", category: "Quality" },
      { reason: "Not as described", category: "Accuracy" },
      { reason: "Unwanted", category: "Preference" },
    ];

    for (let i = 1; i <= 6; i++) {
      const rr = returnReasons[i % returnReasons.length];
      const product = products[i % products.length];
      await db.returnReasonRecord.create({
        data: {
          id: `gid://shopify/ReturnLineItem/${i}`,
          shop: SHOP,
          returnId: `gid://shopify/Return/${((i - 1) % 4) + 1}`,
          orderId: `gid://shopify/Order/${((i - 1) % 4) + 1}`,
          reason: rr.reason,
          category: rr.category,
          productTitle: product.title,
          sku: product.sku,
          quantity: 1 + (i % 3),
          createdAt: new Date(now.getTime() - i * 5 * 24 * 60 * 60 * 1000),
        },
      });
    }

    console.log("E2E seed data created: 20 orders, 8 refunds, 6 return reasons");
  } finally {
    await db.$disconnect();
  }
}

// Run directly if invoked as a script
if (process.argv[1]?.endsWith("seed.js")) {
  seedE2EData().catch(console.error);
}
