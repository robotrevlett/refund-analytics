export function MetricCard({ title, value, tone }) {
  return (
    <s-section>
      <s-stack gap="200">
        <s-text variant="bodySm" as="p" tone="subdued">
          {title}
        </s-text>
        <s-text variant="headingXl" as="p" tone={tone}>
          {value}
        </s-text>
      </s-stack>
    </s-section>
  );
}
