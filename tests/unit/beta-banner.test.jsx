import React from "react";
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PolarisTestProvider } from "@shopify/polaris";
import { BetaBanner } from "../../app/components/BetaBanner.jsx";

function renderWithPolaris(ui) {
  return render(<PolarisTestProvider>{ui}</PolarisTestProvider>);
}

describe("BetaBanner", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  test("renders banner with feedback link", () => {
    renderWithPolaris(<BetaBanner />);
    expect(screen.getByText(/early tester/i)).toBeTruthy();
    expect(screen.getByText(/share your thoughts/i)).toBeTruthy();
  });

  test("dismiss hides the banner", () => {
    renderWithPolaris(<BetaBanner />);
    expect(screen.getByText(/early tester/i)).toBeTruthy();

    const dismissButton = screen.getByRole("button");
    fireEvent.click(dismissButton);

    expect(screen.queryByText(/early tester/i)).toBeNull();
  });

  test("dismissal persists in localStorage", () => {
    renderWithPolaris(<BetaBanner />);
    const dismissButton = screen.getByRole("button");
    fireEvent.click(dismissButton);

    expect(localStorage.getItem("refund-analytics-beta-banner-dismissed")).toBe("1");
  });

  test("does not render if previously dismissed", () => {
    localStorage.setItem("refund-analytics-beta-banner-dismissed", "1");
    renderWithPolaris(<BetaBanner />);
    expect(screen.queryByText(/early tester/i)).toBeNull();
  });
});
