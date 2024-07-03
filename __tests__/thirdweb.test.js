// sum.test.js
import { expect, test } from "vitest";
import { AllWeatherPortfolio } from "../classes/AllWeatherPortfolio.js";
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

  const placeholderAddress = "0xB388be53c8225A60328A906300f821a3af7AC8cd";
  const account = {
    address: placeholderAddress,
  };
  const portfolioHelper = new AllWeatherPortfolio();
  const sum = Object.values(portfolioHelper.weightMapping).reduce(
    (acc, weight) => acc + weight,
    0,
  );
  expect(Math.abs(sum - 1)).toBeLessThan(1e-10);
  await portfolioHelper.initialize();
  const strategy = portfolioHelper.getStrategyData(placeholderAddress);
  for (const [categoryName, sectorObject] of Object.entries(strategy)) {
    expect(categoryNames.includes(categoryName)).toBeTruthy();
    if (Object.keys(sectorObject).length !== 0) {
      expect(sectorObject["arb"].length).toBeGreaterThan(0);
    }
  }
});
