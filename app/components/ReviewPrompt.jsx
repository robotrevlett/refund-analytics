import { Banner } from "@shopify/polaris";
import { useState, useCallback } from "react";

const DISMISS_COUNT_KEY = "refund-analytics-review-prompt-dismissals";
const MAX_SHOWS = 3;
const MIN_DAYS = 14;

export function ReviewPrompt({ installedAt }) {
  const [visible, setVisible] = useState(() => {
    if (!installedAt) return false;

    try {
      const dismissals = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || "0", 10);
      if (dismissals >= MAX_SHOWS) return false;
    } catch {
      return false;
    }

    const installed = new Date(installedAt);
    const now = new Date();
    const daysSinceInstall = (now - installed) / (1000 * 60 * 60 * 24);
    return daysSinceInstall >= MIN_DAYS;
  });

  const handleDismiss = useCallback(() => {
    setVisible(false);
    try {
      const current = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || "0", 10);
      localStorage.setItem(DISMISS_COUNT_KEY, String(current + 1));
    } catch {
      // localStorage unavailable
    }
  }, []);

  if (!visible) return null;

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <Banner
        title="Enjoying Refund Analytics?"
        tone="success"
        onDismiss={handleDismiss}
      >
        <p>
          A review helps other merchants find us.{" "}
          <a
            href="https://apps.shopify.com/refund-analytics/reviews"
            target="_blank"
            rel="noopener noreferrer"
          >
            Leave a review on the Shopify App Store
          </a>
        </p>
      </Banner>
    </div>
  );
}
