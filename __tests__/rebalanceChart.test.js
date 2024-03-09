import exp from "constants";
import { _prepareSunburstData } from "../pages/views/RebalanceChart.jsx";

import { expect, test } from "vitest";

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
