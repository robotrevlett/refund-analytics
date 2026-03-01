# Refund & Return Analytics

A Shopify app that shows merchants their **real revenue after refunds**. Unlike Shopify's built-in reports which inflate revenue numbers, this app groups refunds by **refund date** (not order date) so merchants see the true impact on each period's revenue.

## Screenshots

### Dashboard
KPI cards, refund trend chart, top refunded products, and return reason breakdown — all grouped by refund date.

![Dashboard](docs/screenshots/dashboard.png)

### Product Breakdown
Per-product refund analysis with sortable columns, SKU-level detail, and per-product return reasons.

![Product Breakdown](docs/screenshots/products.png)

### Return Reason Analytics
Structured return reason tracking with category breakdown, trends over time, and reasons by product.

![Return Reason Analytics](docs/screenshots/returns.png)

### Data Sync
Sync status with last synced timestamp and manual re-sync trigger.

![Data Sync](docs/screenshots/sync.png)

### Settings
Store info, sync status, and data summary counts.

![Settings](docs/screenshots/settings.png)

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
| Database | [Prisma](https://www.prisma.io/) + PostgreSQL ([Neon](https://neon.tech/) serverless) |
| API | Shopify GraphQL Admin API (January 2026) |
| Charts | [Recharts](https://recharts.org/) (SVG bar charts styled with Polaris CSS vars) |
| Testing | [Vitest](https://vitest.dev/) (unit/integration) + [Playwright](https://playwright.dev/) (e2e) |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js >= 18
- Docker (for local PostgreSQL) or a [Neon](https://neon.tech/) database
- A [Shopify Partner account](https://partners.shopify.com/) and development store

### Setup

```bash
# Clone the repo
git clone https://github.com/robotrevlett/refund-analytics.git
cd refund-analytics

# Install dependencies
npm install

# Start local PostgreSQL via Docker
docker compose up -d

# Copy environment variables
cp .env.example .env
# Fill in SHOPIFY_API_KEY and SHOPIFY_API_SECRET from your Shopify Partner dashboard
# DATABASE_URL is pre-configured for the local Docker PostgreSQL

# Run database migrations
npx prisma migrate dev

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
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://postgres:postgres@localhost:5432/refund_analytics_dev`) |

## Testing

### Unit & Integration Tests

```bash
npm test              # Run all tests (67 tests)
npx vitest --watch    # Watch mode
```

Tests cover: dashboard metrics, product aggregation, refund trends, return reason analytics, JSONL parsing, sync status, webhook handlers, input validation.

### E2E Tests

```bash
npm run test:e2e      # Run Playwright tests (31 tests)
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

## Known Limitations

- **No data reconciliation on re-sync** — If a refund is deleted in Shopify, re-syncing will not remove it from the app's database. A full reset (clearing data in Settings) and re-sync is needed.

## Deployment

### Railway (Recommended)

The app includes a production `Dockerfile` and `railway.json` for deployment to [Railway](https://railway.app/).

**1. Set up Railway project:**

- Create a new project on Railway
- Add a **PostgreSQL** database service
- Connect your GitHub repo as a service

**2. Configure environment variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Railway if you link the DB) | `postgresql://user:pass@host:5432/dbname` |
| `SHOPIFY_API_KEY` | App API key from Shopify Partners | |
| `SHOPIFY_API_SECRET` | App API secret | |
| `SHOPIFY_APP_URL` | Your Railway public URL | `https://refund-analytics-production.up.railway.app` |
| `SCOPES` | API scopes | `read_orders` |
| `PORT` | Server port (Railway sets this automatically) | `3000` |

**3. Deploy:**

Railway will automatically build using the `Dockerfile` and start the app. The `docker-start` script runs Prisma migrations (`prisma migrate deploy`) before starting the Remix server.

**4. Push Shopify config:**

```bash
# Update your app's URL in shopify.app.toml to your Railway URL, then:
shopify app deploy
```

### Manual / Other Platforms

```bash
# Build for production
npm run build

# Run migrations and start
npm run docker-start
```

For any platform, ensure `DATABASE_URL` points to a PostgreSQL instance and all environment variables above are set.

## License

Private — not for distribution.
