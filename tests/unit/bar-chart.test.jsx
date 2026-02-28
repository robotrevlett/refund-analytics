import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";

// Mock ResizeObserver for jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock;

// Mock ResponsiveContainer — jsdom has no layout engine so it renders at
// 0x0. Replace with a wrapper that clones the child with explicit dimensions,
// which is what the real ResponsiveContainer does after measuring.
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  const { cloneElement } = await import("react");
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 500, height: 300 }}>
        {cloneElement(children, { width: 500, height: 300 })}
      </div>
    ),
  };
});

const { BarChart } = await import("../../app/components/BarChart.jsx");

const TREND_DATA = [
  { date: "2025-01-10", count: 2, amount: 45.0 },
  { date: "2025-01-11", count: 1, amount: 20.5 },
  { date: "2025-01-12", count: 3, amount: 89.99 },
];

const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

describe("BarChart", () => {
  it("returns null when data is null", () => {
    const { container } = render(<BarChart data={null} formatValue={formatCurrency} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when data is empty array", () => {
    const { container } = render(<BarChart data={[]} formatValue={formatCurrency} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders chart SVG after mount", async () => {
    let container;
    await act(async () => {
      ({ container } = render(
        <BarChart data={TREND_DATA} formatValue={formatCurrency} />,
      ));
    });
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("handles single data point without crashing", async () => {
    const singlePoint = [{ date: "2025-01-10", count: 1, amount: 10.0 }];
    let container;
    await act(async () => {
      ({ container } = render(
        <BarChart data={singlePoint} formatValue={formatCurrency} />,
      ));
    });
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("handles all-zero values without crashing", async () => {
    const zeroData = [
      { date: "2025-01-10", count: 0, amount: 0 },
      { date: "2025-01-11", count: 0, amount: 0 },
    ];
    let container;
    await act(async () => {
      ({ container } = render(
        <BarChart data={zeroData} formatValue={formatCurrency} />,
      ));
    });
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
