# Plan: Refund & Return Analytics Dashboard — Shopify App

## Context

The robot research app identified "Refund & Return Analytics" as the #1 opportunity in the Shopify app ecosystem. Shopify's native reports show gross sales but don't properly deduct refunds — merchants report $50K in sales but only $38K in bank deposits. The only dedicated competitor (Refund Reports Rex) has 4 reviews with basic list/export. We'll also bundle Return Reason Analytics (#5) using the new `ReturnReasonDefinition` API (Jan 2026) for differentiation.

**Goal**: Scaffold a new Shopify Remix app repo and build the core analytics dashboard.

---

## Tech Stack

- **Framework**: Remix (Shopify CLI template) — `npm init @shopify/app@latest`
- **UI**: Polaris React components (Page, Card, DataTable, DatePicker, etc.)
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **API**: Shopify GraphQL Admin API (Bulk Operations for large stores)
- **Auth**: Shopify session tokens (token exchange, no OAuth redirects)
- **Scopes**: `read_orders` (covers orders, refunds, returns)

---

## App Architecture

```
refund-analytics/
├── app/
│   ├── routes/
│   │   ├── app.jsx                 # Layout: App Bridge + Polaris
│   │   ├── app._index.jsx          # Dashboard (main page)
│   │   ├── app.products.jsx        # Per-product refund breakdown
│   │   ├── app.returns.jsx         # Return reason analytics (#5)
│   │   ├── app.settings.jsx        # App settings
│   │   ├── app.sync.jsx            # Data sync status + trigger
│   │   ├── auth.$.jsx              # OAuth catch-all
│   │   └── webhooks.jsx            # Webhook handler
│   ├── models/                     # Prisma data access layer
│   │   ├── refund.server.js        # Refund queries/aggregations
│   │   ├── sync.server.js          # Bulk sync logic
│   │   └── return-reason.server.js # Return reason queries
│   ├── components/                 # Shared UI components
│   │   ├── DateRangeSelector.jsx   # Date range picker
│   │   ├── MetricCard.jsx          # KPI display card
│   │   ├── RefundChart.jsx         # Chart component (lightweight)
│   │   └── SyncStatus.jsx          # Sync progress indicator
│   ├── shopify.server.js           # Shopify app config + auth
│   └── db.server.js                # Prisma client singleton
├── prisma/
│   └── schema.prisma               # Session + refund data models
├── extensions/                     # (empty initially)
├── shopify.app.toml                # App config, scopes, webhooks
└── package.json
```

---

## Database Schema (Prisma)

```prisma
model Session {
  id          String    @id
  shop        String
  state       String
  isOnline    Boolean   @default(false)
  scope       String?
  expires     DateTime?
  accessToken String
  userId      BigInt?
}

model Shop {
  id              String   @id  // shop domain
  currency        String   @default("USD")
  lastSyncAt      DateTime?
  syncStatus      String   @default("pending")  // pending, running, completed, failed
  syncOperationId String?
}

model RefundRecord {
  id              String   @id  // Shopify GID
  shop            String
  orderId         String
  orderName       String
  refundDate      DateTime  // createdAt of refund (not order date)
  amount          Float
  currency        String
  note            String?
  reason          String?   // orderAdjustments.reason
  lineItems       String    // JSON array: [{sku, title, quantity, amount}]
  hasReturn       Boolean   @default(false)
  returnId        String?
  createdAt       DateTime  @default(now())

  @@index([shop, refundDate])
  @@index([shop, orderId])
}

model ReturnReasonRecord {
  id              String   @id  // Shopify GID
  shop            String
  returnId        String
  orderId         String
  reason          String    // structured reason from ReturnReasonDefinition
  category        String?   // reason category
  productTitle    String
  sku             String?
  quantity        Int
  createdAt       DateTime

  @@index([shop, createdAt])
  @@index([shop, reason])
}
```

---

## Data Sync Strategy

**Two-phase approach** (bulk ops can't nest connections inside list fields):

1. **Phase 1 — Bulk query**: Fetch all orders with refund summary data (id, date, totalRefundedSet, note) via `bulkOperationRunQuery`. Parse JSONL with `__parentId` linkage.
2. **Phase 2 — Detail fetch**: For each refund ID from Phase 1, paginated GraphQL queries to get `refundLineItems` (SKU, quantity, amount) and `orderAdjustments` (structured reason).
3. **Incremental sync**: After initial sync, use `refunds/create` webhook + `orders/updated` webhook for real-time updates. Periodic full re-sync option.

**Webhooks** (in `shopify.app.toml`):
- `app/uninstalled` — cleanup
- `orders/updated` — catch refund additions
- `refunds/create` — real-time refund tracking
- `bulk_operations/finish` — async sync completion
- GDPR compliance topics

---

## Key Pages

### 1. Dashboard (`app._index.jsx`)
- **KPI row**: Gross Sales, Total Refunds, Net Revenue, Refund Rate %
- **Date range selector**: 7d / 30d / 90d / custom
- **Refund trend chart**: Refunds over time (by refund date, not order date)
- **Top refunded products table**: DataTable with SKU, product, refund count, refund $
- **Refund reasons breakdown**: Pie/bar chart of reason categories

### 2. Product Breakdown (`app.products.jsx`)
- Per-product refund history
- SKU-level drill-down
- Net revenue per product (gross - refunds)

### 3. Return Reasons (`app.returns.jsx`)
- Return reason trends over time
- Category-specific breakdown (sizing, defective, not as described, etc.)
- Product-level return reason mapping

### 4. Sync Status (`app.sync.jsx`)
- Current sync status + progress
- Manual re-sync trigger
- Last sync timestamp

---

## Implementation Steps

### Step 1: Scaffold the app
- Run `npm init @shopify/app@latest` to create the Remix template
- Configure `shopify.app.toml` with scopes (`read_orders`) and webhooks
- Set up Prisma schema with Session + RefundRecord + ReturnReasonRecord + Shop models
- Run initial migration

### Step 2: Build the data sync layer
- Create `models/sync.server.js` — bulk operation start, JSONL parsing, Phase 2 detail fetch
- Create `models/refund.server.js` — aggregation queries (by date, by product, by reason)
- Wire up `webhooks.jsx` to handle `bulk_operations/finish` and `refunds/create`
- Add `app.sync.jsx` route for manual sync trigger + status display

### Step 3: Build the dashboard UI
- Create shared components (DateRangeSelector, MetricCard)
- Build `app._index.jsx` — KPI cards, refund trend (simple table initially, chart later)
- Build `app.products.jsx` — product-level DataTable with refund breakdown
- Use Polaris components throughout (Page, Layout, Card, DataTable, Banner)

### Step 4: Add return reason analytics
- Extend sync to query `ReturnReasonDefinition` and return line items
- Build `app.returns.jsx` — reason breakdown table + trends
- Link return reasons to products

### Step 5: Polish and settings
- Add `app.settings.jsx` — date format preferences, currency display
- Add empty state for new installs (prompt initial sync)
- Error handling + loading states
- Navigation setup in `app.jsx` layout

---

## Testing Strategy

### Test Framework
- **Vitest** — fast, Vite-native, works with Remix out of the box
- **Testing Library** — `@testing-library/react` for component tests
- **MSW (Mock Service Worker)** — intercept Shopify GraphQL API calls in tests
- **Prisma** — use SQLite in-memory for test DB (fast, isolated, no cleanup)

### Test Structure
```
tests/
├── fixtures/
│   ├── orders.json              # 50 realistic orders with varied states
│   ├── refunds.json             # Refunds across those orders (partial, full, multi-item)
│   ├── returns.json             # Returns with structured reasons
│   ├── bulk-operation.jsonl     # Sample JSONL output from Bulk Operations API
│   └── webhooks/
│       ├── refund-create.json   # Sample refunds/create webhook payload
│       ├── order-updated.json   # Sample orders/updated webhook payload
│       └── bulk-finish.json     # Sample bulk_operations/finish payload
├── unit/
│   ├── sync.test.js             # JSONL parsing, two-phase sync logic
│   ├── refund-model.test.js     # Aggregation queries (by date, product, reason)
│   ├── return-reason.test.js    # Return reason grouping and trends
│   └── utils.test.js            # Date helpers, currency formatting
├── integration/
│   ├── dashboard.test.jsx       # Dashboard route loader + render
│   ├── products.test.jsx        # Products route loader + render
│   ├── returns.test.jsx         # Returns route loader + render
│   ├── sync-route.test.jsx      # Sync trigger action + status display
│   └── webhooks.test.js         # Webhook handler dispatching
└── setup.js                     # Vitest global setup (Prisma test DB, MSW server)
```

### Test Data Generator (`tests/fixtures/generate.js`)

A script that generates realistic test data:

- **50 orders** spanning 90 days with realistic amounts ($15-$500)
- **15 orders with refunds** (30% refund rate, matching real-world apparel/electronics)
  - 5 full refunds
  - 7 partial refunds (1-2 line items out of 3-4)
  - 3 multi-refund orders (refunded twice)
- **10 returns** with structured reasons:
  - "Sizing too small" (3), "Sizing too large" (2), "Not as described" (2), "Defective" (2), "Changed mind" (1)
- **Products**: 12 unique products across 3 categories (Apparel, Electronics, Home)
- **Date distribution**: Refund dates deliberately differ from order dates (7-30 day gaps) to validate the "refund date vs order date" distinction
- **Edge cases built in**:
  - Order with refund but no return
  - Return with no refund yet (pending)
  - $0 refund (restock only, no money back)
  - Multi-currency order (presentment vs shop currency)
  - Refund with shipping line refund
  - Order refunded on a different day than the order was placed

### What Each Test Layer Covers

**Unit tests** (no network, no DB):
- `sync.test.js`: Parse JSONL correctly, link children via `__parentId`, handle malformed lines, handle empty responses
- `refund-model.test.js`: Given seeded DB, verify aggregations — total refunds by date range, top refunded products, refund rate calculation, net revenue math
- `return-reason.test.js`: Group reasons by category, calculate trends over time periods
- `utils.test.js`: Currency formatting, date range generation, percentage calculation

**Integration tests** (with test DB + mocked Shopify API):
- Load each route with MSW intercepting `admin.graphql()` calls
- Verify loaders return correct data shapes
- Verify actions (sync trigger) send correct GraphQL mutations
- Verify webhook handler processes payloads and updates DB
- Verify UI renders KPIs, tables, and empty states correctly

### How I (Claude Code) Can Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run tests/unit/sync.test.js

# Run with coverage
npx vitest run --coverage

# Seed the test DB and inspect
node tests/fixtures/generate.js
npx prisma studio
```

### Key Assertions to Validate

1. **Net revenue = Gross sales - Total refunds** (within each date range)
2. **Refunds grouped by refund date** (not order date) — the core differentiator
3. **Per-product breakdown matches** — sum of product-level refunds equals total
4. **JSONL parsing handles all edge cases** — missing fields, empty refunds, malformed lines
5. **Webhook creates new RefundRecord** with correct fields mapped
6. **Aggregation queries perform** — test with 1000+ records to catch N+1 issues
7. **Date range filtering** — 7d/30d/90d/custom all return correct subsets

---

## Verification (End-to-End)

1. `npm test` — all unit + integration tests pass
2. `shopify app dev` — runs the app locally with Cloudflare tunnel
3. Install on a dev store with test orders + refunds
4. Trigger a data sync and verify JSONL parsing
5. Check dashboard shows correct KPIs (gross - refunds = net)
6. Verify refunds appear by refund date (not order date)
7. Create a new refund in Shopify admin and verify webhook updates the dashboard
8. Run `npx prisma studio` to inspect stored data
