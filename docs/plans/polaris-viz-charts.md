# Plan: Replace BarChart with Recharts

**Issue**: #14 — Replace simple bar chart with Recharts
**Branch**: `feature/polaris-viz-charts`

## Background

The current `BarChart.jsx` uses hand-rolled horizontal `<div>` bars with Polaris primitives. It works but looks plain. We're replacing it with Recharts — a lightweight, composable, SVG-based React charting library.

`@shopify/polaris-viz` was the original choice but was deprecated/archived June 2025.

**Polaris style exception**: Recharts renders SVG, which is not a Polaris component. This is an acceptable exception because Polaris does not provide a charting component and their official viz library (`@shopify/polaris-viz`) is archived. We use Polaris CSS custom properties for colors to stay visually consistent.

## Data Shape (no changes needed)

The `getRefundTrend()` model returns:
```js
[{ date: "2025-01-15", count: 3, amount: 45.99 }, ...]
```

The dashboard currently maps this to `{ label, value }` for BarChart. With Recharts we can pass the trend data more directly.

## Steps

### 1. Install Recharts
```bash
npm install recharts
```

### 2. Rewrite `app/components/BarChart.jsx` internals

Keep the file name and export name as `BarChart` — no rename. Rewrite internals to use Recharts.

**New component API**:
```jsx
<BarChart
  data={trend}
  formatValue={formatCurrency}
/>
```

Where `data` is now `[{ date, count, amount }]` (trend array directly) and `formatValue` formats currency for tooltips/axis.

**Implementation details**:
- `ResponsiveContainer` with `width="100%"` and `height={300}`
- `RechartsBarChart` (aliased import) with `data={data}`
- `XAxis dataKey="date"` with tick formatter for short dates (e.g., "Jan 15")
- `YAxis` with currency tick formatting via `formatValue`
- `Tooltip` with custom formatter showing currency
- `Bar dataKey="amount"` with `fill="var(--p-color-bg-fill-info)"` (Polaris CSS custom property, matching current approach)
- `CartesianGrid strokeDasharray="3 3"` for subtle grid lines
- Handle empty/null `data` — return `null` (same as current behavior)

**SSR/Hydration**: Wrap in a `ClientOnly` component to avoid `ResponsiveContainer` hydration mismatch. Recharts needs DOM measurement, so server-render a placeholder `<Box minHeight="300px" />` and render the chart only after mount.

```jsx
function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children() : fallback;
}
```

### 3. Update `app/routes/app._index.jsx`

- Simplify the data prop — pass `trend` directly instead of mapping to `{ label, value }`
- Keep `formatValue={formatCurrency}` prop
- Keep the `DataTable` below the chart — it serves as an accessible data fallback (screen readers, data scanning)

### 4. Add unit tests for BarChart

Add `tests/unit/bar-chart.test.js` with:
- Renders without crashing with valid data
- Returns null when data is empty or null
- Handles single data point
- Handles all-zero values

Use `@testing-library/react` to render and assert on SVG structure.

### 5. Update docs

- **README.md**: Remove the "Simple chart rendering" Known Limitations bullet
- **CLAUDE.md**: Note Recharts dependency in the Tech Stack / Architecture section

### 6. Verify tests pass

- `npm test` — all unit tests including new BarChart tests
- E2E: dashboard test checks `heading "Refund Trend"` which is outside the chart — passes unchanged
- Note: current BarChart renders text via Polaris `Text` components; Recharts renders text as SVG `<text>` elements. No existing tests assert on chart-internal text, so this is a non-issue for current tests but worth noting for future test authors.

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `recharts` dependency |
| `app/components/BarChart.jsx` | Rewrite internals with Recharts (keep name) |
| `app/routes/app._index.jsx` | Simplify data prop passed to BarChart |
| `tests/unit/bar-chart.test.js` | New — unit tests for chart component |
| `README.md` | Remove chart limitation bullet |
| `CLAUDE.md` | Note Recharts in architecture |

## Risks

- **Bundle size**: Recharts pulls in d3 modules — likely ~90-100kb gzipped, not the 45kb often cited. Acceptable for the visual improvement, but verify with `npx vite-bundle-visualizer` after implementation.
- **SSR**: Mitigated by `ClientOnly` wrapper (see step 2).
