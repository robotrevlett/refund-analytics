import { Card, BlockStack, Text } from "@shopify/polaris";

export function MetricCard({ title, value, tone }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="bodySm" as="p" tone="subdued">
          {title}
        </Text>
        <Text variant="headingXl" as="p" tone={tone}>
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}
