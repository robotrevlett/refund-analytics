# Refund & Return Analytics

A Shopify app that shows merchants their **real revenue after refunds**. Unlike Shopify's built-in reports which inflate revenue numbers, this app groups refunds by **refund date** (not order date) so merchants see the true impact on each period's revenue.

## Features

- **Dashboard** — KPI cards (Gross Sales, Total Refunds, Net Revenue, Refund Rate), refund trend chart, top refunded products, return reason breakdown
- **Product Breakdown** — Per-product refund analysis with sortable columns, SKU-level detail, and per-product return reasons
- **Return Reason Analytics** — Structured return reason tracking (Sizing, Quality, Accuracy, Preference), trends over time, reasons by product
- **Data Sync** — Shopify Bulk Operations API with 3-phase sync (orders → refund details → return reasons), real-time webhook updates
- **Settings** — Store info, sync status, data summary

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Remix](https://remix.run/) + [Shopify CLI](https://shopify.dev/docs/apps/tools/cli) |
| UI | [Polaris](https://polaris.shopify.com/) v13 |
| Database | [Prisma](https://www.prisma.io/) + SQLite (dev) / PostgreSQL (prod) |
| API | Shopify GraphQL Admin API (October 2025) |
| Testing | [Vitest](https://vitest.dev/) (unit/integration) + [Playwright](https://playwright.dev/) (e2e) |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js >= 18
- A [Shopify Partner account](https://partners.shopify.com/) and development store

### Setup

```bash
# Clone the repo
git clone https://github.com/robotrevlett/refund-analytics.git
cd refund-analytics

# Install dependencies
npm install

# Set up the database
npx prisma migrate dev

# Copy environment variables
cp .env.example .env
# Fill in SHOPIFY_API_KEY and SHOPIFY_API_SECRET from your Shopify Partner dashboard

# Start the dev server with Shopify tunnel
shopify app dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SHOPIFY_API_KEY` | App API key from Shopify Partners |
| `SHOPIFY_API_SECRET` | App API secret |
| `SHOPIFY_APP_URL` | App URL (set automatically by `shopify app dev`) |
| `SCOPES` | API scopes (`read_orders`) |
| `DATABASE_URL` | Prisma connection string (`file:dev.db` for SQLite) |

## Testing

### Unit & Integration Tests

```bash
npm test              # Run all tests (49 tests across 6 files)
npx vitest --watch    # Watch mode
```

Tests cover: dashboard metrics, product aggregation, refund trends, return reason analytics, JSONL parsing, sync status, webhook handlers, input validation.

### E2E Tests

```bash
npm run test:e2e      # Run Playwright tests (20 tests across 6 specs)
npm run test:e2e:ui   # Interactive Playwright UI
npm run dev:test      # Start the e2e test server manually
```

E2E tests cover all pages: dashboard KPIs, date range selection, product tables, return reasons, sync status, settings, and cross-page navigation.

### CI/CD

GitHub Actions runs both test suites on every push to `main` and on pull requests. See `.github/workflows/ci.yml`.

## Architecture

### Data Sync (Critical Constraint)

Shopify's Bulk Operations API **cannot nest connections inside list fields**. Since `Order.refunds` is a list, `refundLineItems` (a connection) can't be fetched in bulk. This requires a **3-phase sync**:

1. **Bulk query** — Orders + refund summaries via JSONL
2. **Paginated detail** — Refund line items for each refund (rate-limited, 4 concurrent)
3. **Return reasons** — Return line items with structured reasons for refunds linked to returns

Real-time updates come via webhooks (`refunds/create`, `orders/updated`, `bulk_operations/finish`).

### Key Design Decisions

- **Refund date, not order date** — The app's core differentiator. All refund analytics use `RefundRecord.refundDate` (the refund's `createdAt`), not the parent order's date.
- **SKU-based product aggregation** — Products are grouped by SKU (falling back to title) for more reliable aggregation than title-based matching.
- **Human-readable return reasons** — Shopify's `ReturnReason` enum values (`SIZE_TOO_SMALL`, `DAMAGED_DEFECTIVE`, etc.) are mapped to readable labels with categories.

### Directory Structure

```
app/
├── routes/              # Remix file-based routing
│   ├── app.jsx          # Layout (App Bridge + Polaris + nav)
│   ├── app._index.jsx   # Dashboard
│   ├── app.products.jsx # Product breakdown
│   ├── app.returns.jsx  # Return reason analytics
│   ├── app.sync.jsx     # Data sync
│   ├── app.settings.jsx # Settings
│   └── webhooks.jsx     # Webhook handlers
├── models/              # Data access layer
│   ├── refund.server.js  # Dashboard metrics, product refunds
│   ├── return-reason.server.js  # Return reason aggregations
│   └── sync.server.js    # Bulk sync, JSONL parsing
├── components/          # Shared UI components
│   ├── BarChart.jsx
│   ├── DateRangeSelector.jsx
│   ├── MetricCard.jsx
│   └── useCurrencyFormatter.js
├── shopify.server.js    # Shopify app config + auth
├── db.server.js         # Prisma client singleton
└── utils.server.js      # Shared utilities

tests/
├── unit/        # Model function tests
├── integration/ # Webhook handler tests
├── e2e/         # Playwright page tests
└── fixtures/    # Test data generators
```

## Deployment

```bash
# Deploy to Shopify (pushes config: scopes, webhooks)
shopify app deploy

# Build for production
npm run build

# Start production server
npm run start
```

For production, switch `DATABASE_URL` to a PostgreSQL connection string and run `npx prisma migrate deploy`.

## License

Private — not for distribution.
