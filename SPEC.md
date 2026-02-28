# Refund & Return Analytics — Product Spec

## What We're Building

A Shopify app that shows merchants their **real revenue after refunds**, broken down by product, time period, and return reason. Shopify's native reports inflate revenue by 15-25% because they don't properly deduct refunds. This app fixes that.

## The Problem

1. **Shopify shows gross sales, not net revenue.** Merchants report $50K in Shopify but only $38K hits their bank account.
2. **Refunds are shown by order date, not refund date.** A January order refunded in March distorts both months' reports.
3. **No per-product refund breakdown.** Merchants can't identify which products are bleeding money from returns.
4. **Return reasons are invisible.** Shopify's new `ReturnReasonDefinition` API (Jan 2026) provides structured reasons (sizing, defective, etc.) but no app surfaces this data.

## Target Merchant

Any Shopify store processing 50+ orders/month with meaningful return rates — fashion, electronics, home goods. These merchants currently reconcile manually in spreadsheets.

## Competitive Landscape

| Competitor | Weakness |
|---|---|
| Shopify native reports | Gross sales only, wrong date attribution |
| Refund Reports Rex | 4 reviews, simple list/export, no analytics |
| Better Reports / Report Pundit | General tools, $20-100/mo, refunds are a side feature |
| Loop / AfterShip | Returns workflow tools, analytics is an afterthought |

## Core Features (v1)

### 1. Dashboard
- **KPI cards**: Gross Sales, Total Refunds, Net Revenue, Refund Rate %
- **Date range selector**: 7d / 30d / 90d / custom
- **Refund trend**: Refunds over time, plotted by **refund date** (not order date)
- **Top refunded products**: Table showing which products get refunded most
- **Reason breakdown**: Why customers are returning (from structured API data)

### 2. Product Breakdown
- Per-product refund history and net revenue
- SKU-level drill-down
- Sortable by refund count, refund amount, refund rate

### 3. Return Reason Analytics
- Return reasons grouped by category (sizing, defective, not as described, etc.)
- Trends over time — are sizing issues getting worse?
- Per-product reason mapping — which products have which problems?

### 4. Data Sync
- Initial bulk sync via Shopify Bulk Operations API
- Real-time updates via `refunds/create` webhook
- Manual re-sync trigger
- Sync status display

## Technical Architecture

### Stack
- **Framework**: Remix (Shopify CLI template)
- **UI**: Polaris React components
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **API**: Shopify GraphQL Admin API
- **Auth**: Session tokens (token exchange flow)

### Shopify API Scopes
- `read_orders` — covers orders, refunds, returns

### Data Sync Strategy

Shopify's Bulk Operations API cannot nest connections inside list fields. This means we can't get `refundLineItems` in a bulk query. The workaround:

1. **Phase 1 (Bulk)**: Query all orders with refund summaries (id, date, total, note) via `bulkOperationRunQuery`. Parse the JSONL output.
2. **Phase 2 (Paginated)**: For each refund from Phase 1, fetch line item details via paginated GraphQL queries.
3. **Incremental**: After initial sync, webhooks handle new refunds in real-time.

### Database Models

**RefundRecord** — one per Shopify refund
- `id` (Shopify GID), `shop`, `orderId`, `orderName`
- `refundDate` (createdAt of the refund, NOT the order)
- `amount`, `currency`, `note`, `reason`
- `lineItems` (JSON: sku, title, quantity, amount per item)
- `hasReturn`, `returnId`

**ReturnReasonRecord** — one per returned line item
- `id`, `shop`, `returnId`, `orderId`
- `reason` (structured), `category`
- `productTitle`, `sku`, `quantity`

**Shop** — per-install metadata
- `id` (shop domain), `currency`, `lastSyncAt`, `syncStatus`

### Webhooks
- `refunds/create` — real-time refund tracking
- `orders/updated` — catch refund additions
- `bulk_operations/finish` — async sync completion
- `app/uninstalled` — cleanup session + data
- GDPR compliance: `customers/data_request`, `customers/redact`, `shop/redact`

## Testing Strategy

### Test Framework
- **Vitest** + **Testing Library** + **MSW** (Mock Service Worker)
- SQLite in-memory for isolated test DB

### Test Data

A fixture generator creates realistic test data:
- 50 orders spanning 90 days ($15-$500)
- 15 orders with refunds (30% rate) — full, partial, and multi-refund
- 10 returns with structured reasons across categories
- 12 products across 3 categories (Apparel, Electronics, Home)
- Edge cases: refund date != order date, $0 restocks, multi-currency, shipping refunds

### Test Layers

**Unit** (no network, no DB):
- JSONL parsing and `__parentId` linkage
- Aggregation math (totals, rates, grouping)
- Date range and currency utilities

**Integration** (test DB + MSW-mocked Shopify API):
- Route loaders return correct data
- Sync actions trigger correct GraphQL calls
- Webhook handler creates correct DB records
- UI renders KPIs, tables, empty states

**End-to-end**:
- `shopify app dev` on a Shopify dev store
- Create orders/refunds in admin, verify dashboard updates

### Key Assertions
1. Net revenue = Gross - Refunds (per date range)
2. Refunds grouped by refund date, not order date
3. Product-level refund sums equal total refunds
4. JSONL parser handles malformed/missing data gracefully
5. Webhook → DB record mapping is correct

## Pricing

$9-19/mo — undercuts Better Reports ($20-100/mo) and general reporting tools.

## Out of Scope (v1)
- Export to CSV/PDF (v2)
- Email alerts for high refund rates (v2)
- Multi-store aggregation (v2)
- Shopify Flow integration (v2)
- Comparison periods (this month vs last month) (v2)
