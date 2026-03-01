import { useState, useCallback, useRef, useEffect } from "react";

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

  const selectRef = useRef(null);
  const textFieldRef = useRef(null);

  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;
    const handler = (e) => handleSelectChange(e.target.value);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [handleSelectChange]);

  useEffect(() => {
    const el = textFieldRef.current;
    if (!el) return;
    const inputHandler = (e) => handleCustomChange(e.target.value);
    const blurHandler = () => handleCustomBlur();
    el.addEventListener("input", inputHandler);
    el.addEventListener("blur", blurHandler);
    return () => {
      el.removeEventListener("input", inputHandler);
      el.removeEventListener("blur", blurHandler);
    };
  }, [handleCustomChange, handleCustomBlur]);

  return (
    <s-stack direction="horizontal" gap="200" block-align="end">
      <s-select
        ref={selectRef}
        label="Date range"
        label-hidden
        value={mode}
      >
        {PRESET_OPTIONS.map((opt) => (
          <s-option key={opt.value} value={opt.value}>
            {opt.label}
          </s-option>
        ))}
      </s-select>
      {mode === "custom" && (
        <s-stack direction="horizontal" gap="100" block-align="end">
          <s-text-field
            ref={textFieldRef}
            label="Days"
            label-hidden
            type="number"
            value={customDays}
            auto-complete="off"
            min="1"
            max="365"
            placeholder="e.g. 60"
          />
          <span style={{ whiteSpace: "nowrap", padding: "6px 8px" }}>
            days
          </span>
        </s-stack>
      )}
    </s-stack>
  );
}
