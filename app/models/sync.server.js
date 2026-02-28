import db from "../db.server.js";

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
          customer {
            id
            displayName
            email
          }
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
  // Ensure shop record exists
  await db.shop.upsert({
    where: { id: shop },
    update: { syncStatus: "running" },
    create: { id: shop, syncStatus: "running" },
  });

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
  return data.node;
}

export async function processCompletedSync(admin, shop, jsonlUrl) {
  try {
    // Phase 1: Download and parse JSONL
    const records = await downloadAndParseJSONL(jsonlUrl);

    // Extract refund IDs for Phase 2
    const refundIds = records
      .filter((r) => r.id && r.id.includes("/Refund/"))
      .map((r) => r.id);

    // Phase 2: Fetch line item details for each refund
    const refundDetails = await fetchRefundDetails(admin, refundIds);

    // Determine shop currency from first order
    const firstOrder = records.find(
      (r) => r.id && r.id.includes("/Order/"),
    );
    const currency =
      firstOrder?.totalPriceSet?.shopMoney?.currencyCode || "USD";

    // Save refund records to DB
    for (const detail of refundDetails) {
      const lineItems = (detail.refundLineItems?.edges || []).map(
        ({ node }) => ({
          sku: node.lineItem?.sku || "",
          title: node.lineItem?.title || "",
          quantity: node.quantity,
          amount: parseFloat(node.subtotalSet?.shopMoney?.amount || 0),
        }),
      );

      const reason =
        detail.orderAdjustments?.edges?.[0]?.node?.reason || null;

      await db.refundRecord.upsert({
        where: { id: detail.id },
        update: {
          amount: parseFloat(
            detail.totalRefundedSet?.shopMoney?.amount || 0,
          ),
          note: detail.note || null,
          reason,
          lineItems: JSON.stringify(lineItems),
          hasReturn: !!detail.return,
          returnId: detail.return?.id || null,
        },
        create: {
          id: detail.id,
          shop,
          orderId: detail.order?.id || "",
          orderName: detail.order?.name || "",
          refundDate: new Date(detail.createdAt),
          amount: parseFloat(
            detail.totalRefundedSet?.shopMoney?.amount || 0,
          ),
          currency,
          note: detail.note || null,
          reason,
          lineItems: JSON.stringify(lineItems),
          hasReturn: !!detail.return,
          returnId: detail.return?.id || null,
        },
      });
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
  const text = await response.text();
  return parseJSONL(text);
}

export function parseJSONL(text) {
  if (!text || !text.trim()) return [];

  const lines = text.trim().split("\n");
  const records = {};
  const rootRecords = [];

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

    if (!obj.__parentId) {
      rootRecords.push(obj);
    } else {
      const parent = records[obj.__parentId];
      if (parent) {
        if (!parent._children) parent._children = [];
        parent._children.push(obj);
      }
    }
  }

  return Object.values(records);
}

async function fetchRefundDetails(admin, refundIds) {
  const details = [];

  for (const refundId of refundIds) {
    try {
      const response = await admin.graphql(REFUND_DETAIL_QUERY, {
        variables: { id: refundId },
      });
      const { data } = await response.json();
      if (data.node) {
        details.push(data.node);
      }
    } catch (error) {
      console.warn(`Failed to fetch refund ${refundId}:`, error.message);
    }
  }

  return details;
}
