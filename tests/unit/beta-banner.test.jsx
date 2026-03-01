import React from "react";
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { BetaBanner } from "../../app/components/BetaBanner.jsx";

describe("BetaBanner", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  test("renders banner with feedback link", () => {
    const { container } = render(<BetaBanner />);
    const banner = container.querySelector("s-banner");
    expect(banner).toBeTruthy();
    expect(banner.getAttribute("title")).toContain("early tester");
    expect(container.textContent).toContain("Share your thoughts");
  });

  test("dismiss hides the banner", () => {
    const { container } = render(<BetaBanner />);
    const banner = container.querySelector("s-banner");
    expect(banner).toBeTruthy();

    // Simulate the dismiss event that the web component would fire
    act(() => {
      banner.dispatchEvent(new Event("dismiss"));
    });

    // After dismiss, banner should be gone
    expect(container.querySelector("s-banner")).toBeNull();
  });

  test("dismissal persists in localStorage", () => {
    const { container } = render(<BetaBanner />);
    const banner = container.querySelector("s-banner");
    act(() => {
      banner.dispatchEvent(new Event("dismiss"));
    });

    expect(localStorage.getItem("refund-analytics-beta-banner-dismissed")).toBe("1");
  });

  test("does not render if previously dismissed", () => {
    localStorage.setItem("refund-analytics-beta-banner-dismissed", "1");
    const { container } = render(<BetaBanner />);
    expect(container.querySelector("s-banner")).toBeNull();
  });
});
