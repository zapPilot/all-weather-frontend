import exp from "constants";
import { _prepareSunburstData, RebalanceChart } from "../pages/views/RebalanceChart.jsx";
import { vi, expect, describe, it, test } from "vitest";
import { render, screen } from "./test-utils";
import { waitFor } from "@testing-library/dom";

test("RebalanceChart funcs", () => {
  const result = { children: [] };
  const category = "long_term_bond";
  const nameToColor = {
    long_term_bond: "#12939A",
  };
  const name = "long_term_bond";
  const idx = 0;
  const weightedValue = 100;
  expect(
    _prepareSunburstData(
      result,
      nameToColor,
      name,
      idx,
      category,
      weightedValue,
    ),
  ).toEqual([{ long_term_bond: "#12939A" }, 1]);
});


describe("RebalanceChart Component", () => {
  it("normal rendering without any http request", async () => {
    // Render the Dashboard component
    // TODO(david): fix it
    // render(<RebalanceChart />);
  });
});