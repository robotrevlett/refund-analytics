import { BlockStack, InlineStack, Text, Box } from "@shopify/polaris";

/**
 * Simple horizontal bar chart using Polaris primitives.
 * Each row shows a label, bar, and value.
 */
export function BarChart({ data, formatValue, maxItems = 20 }) {
  if (!data || data.length === 0) return null;

  const items = data.slice(0, maxItems);
  const maxVal = Math.max(...items.map((d) => d.value), 1);

  return (
    <BlockStack gap="200">
      {items.map((item, i) => (
        <InlineStack key={i} gap="200" blockAlign="center" wrap={false}>
          <Box minWidth="100px" maxWidth="140px">
            <Text variant="bodySm" as="span" truncate>
              {item.label}
            </Text>
          </Box>
          <Box width="100%">
            <div
              style={{
                height: "20px",
                borderRadius: "var(--p-border-radius-100)",
                backgroundColor: "var(--p-color-bg-fill-info)",
                width: `${Math.max((item.value / maxVal) * 100, 2)}%`,
                transition: "width 0.3s ease",
              }}
            />
          </Box>
          <Box minWidth="60px">
            <Text variant="bodySm" as="span" alignment="end">
              {formatValue ? formatValue(item.value) : item.value}
            </Text>
          </Box>
        </InlineStack>
      ))}
    </BlockStack>
  );
}
