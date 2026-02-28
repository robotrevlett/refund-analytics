import { Select, InlineGrid, TextField, InlineStack } from "@shopify/polaris";
import { useState, useCallback } from "react";

const PRESET_OPTIONS = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "Custom", value: "custom" },
];

export function DateRangeSelector({ days, onDaysChange }) {
  const isPreset = ["7", "30", "90"].includes(String(days));
  const [mode, setMode] = useState(isPreset ? String(days) : "custom");
  const [customDays, setCustomDays] = useState(isPreset ? "" : String(days));

  const handleSelectChange = useCallback(
    (value) => {
      setMode(value);
      if (value !== "custom") {
        onDaysChange(value);
      }
    },
    [onDaysChange],
  );

  const handleCustomChange = useCallback((value) => {
    setCustomDays(value);
  }, []);

  const handleCustomBlur = useCallback(() => {
    const parsed = parseInt(customDays, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 365) {
      onDaysChange(String(parsed));
    }
  }, [customDays, onDaysChange]);

  return (
    <InlineStack gap="200" blockAlign="end">
      <Select
        label="Date range"
        labelHidden
        options={PRESET_OPTIONS}
        value={mode}
        onChange={handleSelectChange}
      />
      {mode === "custom" && (
        <TextField
          label="Days"
          labelHidden
          type="number"
          value={customDays}
          onChange={handleCustomChange}
          onBlur={handleCustomBlur}
          autoComplete="off"
          min={1}
          max={365}
          placeholder="e.g. 60"
          connectedRight={
            <span style={{ whiteSpace: "nowrap", padding: "6px 8px" }}>
              days
            </span>
          }
        />
      )}
    </InlineStack>
  );
}
