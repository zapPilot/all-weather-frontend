import { expect, describe, it } from "vitest";
import { render, screen } from "./test-utils.tsx";
import RebalanceChart from "../pages/views/RebalanceChart";

describe("RebalanceChart Component", () => {
  it("Test Default RebalanceChart", async () => {
    render(<RebalanceChart />);
    const chart = await screen.findAllByRole("sunburst-chart");
    expect(chart).toHaveLength(1);
  });
});
