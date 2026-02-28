import { useState, useEffect } from "react";
import { Box } from "@shopify/polaris";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children() : fallback;
}

function formatDateTick(dateStr) {
  const [, month, day] = dateStr.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
}

/**
 * Bar chart for refund trend data, powered by Recharts.
 * Expects data as [{ date, count, amount }].
 *
 * Note: Recharts renders SVG, not Polaris components. This is an accepted
 * exception — Polaris has no charting component and @shopify/polaris-viz
 * is archived. We use Polaris CSS custom properties for visual consistency.
 */
export function BarChart({ data, formatValue }) {
  if (!data || data.length === 0) return null;

  return (
    <ClientOnly fallback={<Box minHeight="300px" />}>
      {() => (
        <ResponsiveContainer width="100%" height={300}>
          <RechartsBarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip
              formatter={(value) => [formatValue ? formatValue(value) : value, "Refunds"]}
              labelFormatter={formatDateTick}
            />
            <Bar
              dataKey="amount"
              fill="var(--p-color-bg-fill-info)"
              radius={[4, 4, 0, 0]}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      )}
    </ClientOnly>
  );
}
