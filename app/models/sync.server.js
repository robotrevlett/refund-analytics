import db from "../db.server.js";

// Note: ORDERS_BULK_QUERY lacks #graphql tag intentionally — it's passed as
// a string variable to bulkOperationRunQuery, not used as a tagged template.
const ORDERS_BULK_QUERY = `
  {
    orders {
      edges {
        node {
          id
          name
          createdAt
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFinancialStatus
          refunds {
            id
            createdAt
            note
            totalRefundedSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
`;

const START_BULK_MUTATION = `#graphql
  mutation StartBulkQuery($query: String!) {
    bulkOperationRunQuery(query: $query) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const POLL_BULK_QUERY = `#graphql
  query PollBulkOperation($id: ID!) {
    node(id: $id) {
      ... on BulkOperation {
        id
        status
        errorCode
        objectCount
        fileSize
        url
        partialDataUrl
      }
    }
  }
`;

const REFUND_DETAIL_QUERY = `#graphql
  query RefundDetail($id: ID!) {
    node(id: $id) {
      ... on Refund {
        id
        createdAt
        note
        totalRefundedSet {
          shopMoney { amount currencyCode }
        }
        order {
          id
          name
        }
        return {
          id
        }
        refundLineItems(first: 50) {
          edges {
            node {
              quantity
              restockType
              subtotalSet {
                shopMoney { amount }
              }
              lineItem {
                title
                sku
              }
            }
          }
        }
        orderAdjustments(first: 10) {
          edges {
            node {
              reason
              amountSet {
                shopMoney { amount }
              }
            }
          }
        }
      }
    }
  }
`;

const RETURN_DETAIL_QUERY = `#graphql
  query ReturnDetail($id: ID!) {
    node(id: $id) {
      ... on Return {
        id
        createdAt
        order {
          id
        }
        returnLineItems(first: 50) {
          edges {
            node {
              id
              quantity
              returnReasonDefinition {
                handle
                name
              }
              returnReasonNote
              customerNote
              lineItem {
                title
                sku
              }
            }
          }
        }
      }
    }
  }
`;

// Max concurrent refund detail requests to stay within Shopify rate limits
const REFUND_DETAIL_CONCURRENCY = 4;
// Delay between batches (ms) to respect rate limits
const REFUND_DETAIL_BATCH_DELAY = 500;

export async function getShopSyncStatus(shop) {
  const shopRecord = await db.shop.findUnique({ where: { id: shop } });

  if (!shopRecord) {
    return { status: "pending", lastSyncAt: null, operationId: null };
  }

  return {
    status: shopRecord.syncStatus,
    lastSyncAt: shopRecord.lastSyncAt,
    operationId: shopRecord.syncOperationId,
  };
}

export async function startBulkSync(admin, shop) {
  // Ensure the shop record exists
  await db.shop.upsert({
    where: { id: shop },
    update: {},
    create: { id: shop, syncStatus: "pending" },
  });

  // Atomic compare-and-set: only update if NOT already running
  const updated = await db.shop.updateMany({
    where: { id: shop, syncStatus: { not: "running" } },
    data: { syncStatus: "running" },
  });

  if (updated.count === 0) {
    return { success: false, errors: [{ message: "Sync already in progress" }] };
  }

  const response = await admin.graphql(START_BULK_MUTATION, {
    variables: { query: ORDERS_BULK_QUERY },
  });

  const { data } = await response.json();
  const { bulkOperation, userErrors } = data.bulkOperationRunQuery;

  if (userErrors.length > 0) {
    await db.shop.update({
      where: { id: shop },
      data: { syncStatus: "failed" },
    });
    return { success: false, errors: userErrors };
  }

  await db.shop.update({
    where: { id: shop },
    data: { syncOperationId: bulkOperation.id },
  });

  return { success: true, operationId: bulkOperation.id };
}

export async function pollBulkOperation(admin, operationId) {
  const response = await admin.graphql(POLL_BULK_QUERY, {
    variables: { id: operationId },
  });

  const { data } = await response.json();
  if (!data.node) {
    return { status: "UNKNOWN", url: null };
  }
  return data.node;
}

export async function markSyncFailed(shop) {
  await db.shop.update({
    where: { id: shop },
    data: { syncStatus: "failed", syncOperationId: null },
  });
}

export async function processCompletedSync(admin, shop, jsonlUrl) {
  try {
    // Phase 1: Download and parse JSONL
    const records = await downloadAndParseJSONL(jsonlUrl);

    // Extract refund IDs for Phase 2
    const refundIds = records
      .filter((r) => r.id && r.id.includes("/Refund/"))
      .map((r) => r.id);

    // Phase 2: Fetch line item details with rate-limited concurrency
    const refundDetails = await fetchRefundDetails(admin, refundIds);

    // Determine shop currency from first order
    const firstOrder = records.find(
      (r) => r.id && r.id.includes("/Order/"),
    );
    const currency =
      firstOrder?.totalPriceSet?.shopMoney?.currencyCode || "USD";

    // Save order records to DB
    const orderRecords = records.filter(
      (r) => r.id && r.id.includes("/Order/"),
    );
    for (const order of orderRecords) {
      await db.orderRecord.upsert({
        where: { id: order.id },
        update: {
          totalAmount: order.totalPriceSet?.shopMoney?.amount || "0",
          financialStatus: order.displayFinancialStatus || "PAID",
        },
        create: {
          id: order.id,
          shop,
          name: order.name || "",
          orderDate: new Date(order.createdAt),
          totalAmount: order.totalPriceSet?.shopMoney?.amount || "0",
          currency,
          financialStatus: order.displayFinancialStatus || "PAID",
        },
      });
    }

    // Save refund records to DB and collect return IDs
    const returnIds = [];

    for (const detail of refundDetails) {
      const lineItems = (detail.refundLineItems?.edges || []).map(
        ({ node }) => ({
          sku: node.lineItem?.sku || "",
          title: node.lineItem?.title || "",
          quantity: node.quantity,
          amount: node.subtotalSet?.shopMoney?.amount || "0",
        }),
      );

      const reason =
        detail.orderAdjustments?.edges?.[0]?.node?.reason || null;

      if (detail.return?.id) {
        returnIds.push(detail.return.id);
      }

      await db.refundRecord.upsert({
        where: { id: detail.id },
        update: {
          amount: detail.totalRefundedSet?.shopMoney?.amount || "0",
          note: detail.note || null,
          reason,
          lineItems: JSON.stringify(lineItems),
          hasReturn: !!detail.return,
          returnId: detail.return?.id || null,
          orderName: detail.order?.name || undefined,
          currency: detail.totalRefundedSet?.shopMoney?.currencyCode || currency,
        },
        create: {
          id: detail.id,
          shop,
          orderId: detail.order?.id || "",
          orderName: detail.order?.name || "",
          refundDate: new Date(detail.createdAt),
          amount: detail.totalRefundedSet?.shopMoney?.amount || "0",
          currency: detail.totalRefundedSet?.shopMoney?.currencyCode || currency,
          note: detail.note || null,
          reason,
          lineItems: JSON.stringify(lineItems),
          hasReturn: !!detail.return,
          returnId: detail.return?.id || null,
        },
      });
    }

    // Phase 3: Fetch and save return reason details
    if (returnIds.length > 0) {
      const uniqueReturnIds = [...new Set(returnIds)];
      const returnDetails = await fetchReturnDetails(admin, uniqueReturnIds);
      await saveReturnReasons(shop, returnDetails);
    }

    // Update shop record
    await db.shop.update({
      where: { id: shop },
      data: {
        syncStatus: "completed",
        lastSyncAt: new Date(),
        currency,
        syncOperationId: null,
      },
    });
  } catch (error) {
    console.error("Sync processing failed:", error);
    await db.shop.update({
      where: { id: shop },
      data: { syncStatus: "failed", syncOperationId: null },
    });
    throw error;
  }
}

export async function downloadAndParseJSONL(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download JSONL: ${response.status} ${response.statusText}`,
    );
  }
  const text = await response.text();
  return parseJSONL(text);
}

export function parseJSONL(text) {
  if (!text || !text.trim()) return [];

  const lines = text.trim().split("\n");
  const records = {};

  for (const line of lines) {
    if (!line.trim()) continue;

    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      console.warn("Skipping malformed JSONL line:", line.substring(0, 100));
      continue;
    }

    if (!obj.id) continue;

    records[obj.id] = obj;

    if (obj.__parentId) {
      const parent = records[obj.__parentId];
      if (parent) {
        if (!parent._children) parent._children = [];
        parent._children.push(obj);
      }
    }
  }

  return Object.values(records);
}

/**
 * Fetch refund line item details with rate-limited concurrency.
 * Processes refunds in batches to stay within Shopify's GraphQL rate limits.
 */
async function fetchRefundDetails(admin, refundIds) {
  const details = [];

  for (let i = 0; i < refundIds.length; i += REFUND_DETAIL_CONCURRENCY) {
    const batch = refundIds.slice(i, i + REFUND_DETAIL_CONCURRENCY);

    const batchResults = await Promise.allSettled(
      batch.map(async (refundId) => {
        const response = await admin.graphql(REFUND_DETAIL_QUERY, {
          variables: { id: refundId },
        });
        const { data } = await response.json();
        return data.node;
      }),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        details.push(result.value);
      } else if (result.status === "rejected") {
        console.warn("Failed to fetch refund detail:", result.reason?.message);
      }
    }

    // Delay between batches to respect rate limits
    if (i + REFUND_DETAIL_CONCURRENCY < refundIds.length) {
      await new Promise((resolve) => setTimeout(resolve, REFUND_DETAIL_BATCH_DELAY));
    }
  }

  return details;
}

/**
 * Fetch return line item details with rate-limited concurrency.
 * Uses the same batching strategy as fetchRefundDetails.
 */
async function fetchReturnDetails(admin, returnIds) {
  const details = [];

  for (let i = 0; i < returnIds.length; i += REFUND_DETAIL_CONCURRENCY) {
    const batch = returnIds.slice(i, i + REFUND_DETAIL_CONCURRENCY);

    const batchResults = await Promise.allSettled(
      batch.map(async (returnId) => {
        const response = await admin.graphql(RETURN_DETAIL_QUERY, {
          variables: { id: returnId },
        });
        const { data } = await response.json();
        return data.node;
      }),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        details.push(result.value);
      } else if (result.status === "rejected") {
        console.warn("Failed to fetch return detail:", result.reason?.message);
      }
    }

    if (i + REFUND_DETAIL_CONCURRENCY < returnIds.length) {
      await new Promise((resolve) => setTimeout(resolve, REFUND_DETAIL_BATCH_DELAY));
    }
  }

  return details;
}

/**
 * Map Shopify returnReasonDefinition handles to analytics categories.
 * Unknown handles fall back to "Other" — safe for future Shopify additions.
 */
export const HANDLE_TO_CATEGORY = {
  "too-small": "Sizing",
  "too-tight": "Sizing",
  "too-large": "Sizing",
  "too-loose": "Sizing",
  "too-short": "Sizing",
  "too-long": "Sizing",
  "unwanted": "Preference",
  "style": "Preference",
  "color": "Preference",
  "not-as-described": "Accuracy",
  "wrong-item": "Accuracy",
  "damaged": "Quality",
  "defective": "Quality",
  "arrived-late": "Fulfillment",
};

export function mapReturnReason(definition) {
  if (!definition) return { label: "Unknown", category: "Other" };
  const category = HANDLE_TO_CATEGORY[definition.handle] || "Other";
  return { label: definition.name, category };
}

/**
 * Save return reason records to the database from fetched Return details.
 */
export async function saveReturnReasons(shop, returnDetails) {
  for (const ret of returnDetails) {
    const orderId = ret.order?.id || "";
    const returnId = ret.id;
    const returnDate = ret.createdAt ? new Date(ret.createdAt) : new Date();

    for (const { node } of ret.returnLineItems?.edges || []) {
      const { label, category } = mapReturnReason(node.returnReasonDefinition);

      await db.returnReasonRecord.upsert({
        where: { id: node.id },
        update: {
          reason: label,
          category,
          quantity: node.quantity,
          productTitle: node.lineItem?.title || "Unknown",
          sku: node.lineItem?.sku || null,
        },
        create: {
          id: node.id,
          shop,
          returnId,
          orderId,
          reason: label,
          category,
          productTitle: node.lineItem?.title || "Unknown",
          sku: node.lineItem?.sku || null,
          quantity: node.quantity,
          createdAt: returnDate,
        },
      });
    }
  }
}
