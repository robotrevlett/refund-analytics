import React from "react";
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { ReviewPrompt } from "../../app/components/ReviewPrompt.jsx";

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
    const { container } = render(<ReviewPrompt installedAt={null} />);
    expect(container.querySelector("s-banner")).toBeNull();
  });

  test("does not render if installed less than 14 days ago", () => {
    const { container } = render(<ReviewPrompt installedAt={daysAgo(7)} />);
    expect(container.querySelector("s-banner")).toBeNull();
  });

  test("renders after 14 days", () => {
    const { container } = render(<ReviewPrompt installedAt={daysAgo(15)} />);
    const banner = container.querySelector("s-banner");
    expect(banner).toBeTruthy();
    expect(banner.getAttribute("title")).toContain("Enjoying");
    expect(container.textContent).toContain("Leave a review");
  });

  test("dismiss increments counter and hides", () => {
    const { container } = render(<ReviewPrompt installedAt={daysAgo(15)} />);
    const banner = container.querySelector("s-banner");
    act(() => {
      banner.dispatchEvent(new Event("dismiss"));
    });

    expect(container.querySelector("s-banner")).toBeNull();
    expect(localStorage.getItem("refund-analytics-review-prompt-dismissals")).toBe("1");
  });

  test("does not render after 3 dismissals", () => {
    localStorage.setItem("refund-analytics-review-prompt-dismissals", "3");
    const { container } = render(<ReviewPrompt installedAt={daysAgo(30)} />);
    expect(container.querySelector("s-banner")).toBeNull();
  });

  test("renders on 2nd dismissal (under max of 3)", () => {
    localStorage.setItem("refund-analytics-review-prompt-dismissals", "2");
    const { container } = render(<ReviewPrompt installedAt={daysAgo(20)} />);
    expect(container.querySelector("s-banner")).toBeTruthy();
  });
});
