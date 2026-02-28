import React from "react";
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PolarisTestProvider } from "@shopify/polaris";
import { ReviewPrompt } from "../../app/components/ReviewPrompt.jsx";

function renderWithPolaris(ui) {
  return render(<PolarisTestProvider>{ui}</PolarisTestProvider>);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe("ReviewPrompt", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  test("does not render without installedAt", () => {
    renderWithPolaris(<ReviewPrompt installedAt={null} />);
    expect(screen.queryByText(/enjoying/i)).toBeNull();
  });

  test("does not render if installed less than 14 days ago", () => {
    renderWithPolaris(<ReviewPrompt installedAt={daysAgo(7)} />);
    expect(screen.queryByText(/enjoying/i)).toBeNull();
  });

  test("renders after 14 days", () => {
    renderWithPolaris(<ReviewPrompt installedAt={daysAgo(15)} />);
    expect(screen.getByText(/enjoying/i)).toBeTruthy();
    expect(screen.getByText(/leave a review/i)).toBeTruthy();
  });

  test("dismiss increments counter and hides", () => {
    renderWithPolaris(<ReviewPrompt installedAt={daysAgo(15)} />);
    const dismissButton = screen.getByRole("button");
    fireEvent.click(dismissButton);

    expect(screen.queryByText(/enjoying/i)).toBeNull();
    expect(localStorage.getItem("refund-analytics-review-prompt-dismissals")).toBe("1");
  });

  test("does not render after 3 dismissals", () => {
    localStorage.setItem("refund-analytics-review-prompt-dismissals", "3");
    renderWithPolaris(<ReviewPrompt installedAt={daysAgo(30)} />);
    expect(screen.queryByText(/enjoying/i)).toBeNull();
  });

  test("renders on 2nd dismissal (under max of 3)", () => {
    localStorage.setItem("refund-analytics-review-prompt-dismissals", "2");
    renderWithPolaris(<ReviewPrompt installedAt={daysAgo(20)} />);
    expect(screen.getByText(/enjoying/i)).toBeTruthy();
  });
});
