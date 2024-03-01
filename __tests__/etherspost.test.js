// sum.test.js
import { expect, test } from "vitest";
import { AllWeatherPortfolio } from "../utils/etherspot";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

test("AllWeatherPortfolio initialize", async () => {
  const categoryNames = [
    "long_term_bond",
    "intermediate_term_bond",
    "commodities",
    "gold",
    "large_cap_us_stocks",
    "small_cap_us_stocks",
    "non_us_developed_market_stocks",
    "non_us_emerging_market_stocks",
  ];
  const portfolioHelper = new AllWeatherPortfolio();
  await portfolioHelper.initialize();
  for (const [categoryName, sectorObject] of Object.entries(
    portfolioHelper.strategy,
  )) {
    expect(categoryNames.includes(categoryName)).toBeTruthy();
    if (Object.keys(sectorObject).length !== 0) {
      expect(sectorObject[42161].length).toBeGreaterThan(0);
    }
  }
});
