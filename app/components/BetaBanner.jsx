import { Banner } from "@shopify/polaris";
import { useState, useCallback } from "react";

const DISMISSED_KEY = "refund-analytics-beta-banner-dismissed";
const FEEDBACK_URL = "https://forms.gle/refund-analytics-feedback";

export function BetaBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // localStorage unavailable — dismiss for this session only
    }
  }, []);

  if (dismissed) return null;

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <Banner
        title="Beta — You're an early tester!"
        tone="info"
        onDismiss={handleDismiss}
      >
        <p>
          We'd love your feedback.{" "}
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
            Share your thoughts
          </a>{" "}
          to help shape the product.
        </p>
      </Banner>
    </div>
  );
}
