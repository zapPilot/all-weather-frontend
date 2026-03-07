import {
  sortByDate,
  calculateStdDevFilter,
  calculateDailyDifferences,
  calculateDailyROI,
} from "./chartUtils";

// Configuration
const DAYS_IN_YEAR = 365;
const COMPOUND_FREQUENCY = {
  DAILY: DAYS_IN_YEAR, // 365 times per year
  WEEKLY: 52, // 52 times per year
  MONTHLY: 12, // 12 times per year
  QUARTERLY: 4, // 4 times per year
  ANNUALLY: 1, // once per year
  NEVER: 0, // simple interest
};
const COMPOUND_FREQ = COMPOUND_FREQUENCY.NEVER; // Using simple interest by default

export const CHART_CONFIGS = {
  historicalBalances: {
    title: "Historical Balances",
    option: "line",
    yLabel: "usd_value",
    dataTransform: (response) => response.json(),
    calculateTitle: () => "Historical Balances",
  },
  dailyPnL: {
    title: "Daily P&L",
    option: "column",
    yLabel: "pnl",
    dataTransform: async (response) => {
      const data = await response.json();
      const sortedData = sortByDate(data);
      const dailyDiffs = calculateDailyDifferences(sortedData);
      return calculateStdDevFilter(dailyDiffs, "pnl");
    },
    calculateTitle: (data) => {
      const totalPnL = data.reduce((sum, item) => sum + (item.pnl || 0), 0);
      return `Daily P&L (Total: $${totalPnL.toFixed(2)})`;
    },
  },
  dailyROI: {
    title: "Daily ROI (%)",
    option: "column",
    yLabel: "roi",
    dataTransform: async (response) => {
      const data = await response.json();
      const sortedData = sortByDate(data);
      const dailyROIs = calculateDailyROI(sortedData);
      return calculateStdDevFilter(dailyROIs, "roi");
    },
    calculateTitle: (data) => {
      const validROIs = data.filter(
        (item) => item.roi !== 0 && item.principal && item.principal > 0,
      );

      if (validROIs.length === 0) return "Daily ROI (Avg: 0%)";

      // Calculate weighted average
      const totalWeight = validROIs.reduce(
        (sum, item) => sum + item.principal,
        0,
      );
      const weightedAvgDailyROI =
        validROIs.reduce((sum, item) => sum + item.roi * item.principal, 0) /
        totalWeight;
      // Annualize
      let annualizedROI;
      if (COMPOUND_FREQ === 0) {
        annualizedROI = weightedAvgDailyROI * DAYS_IN_YEAR;
      } else {
        const R = (weightedAvgDailyROI * DAYS_IN_YEAR) / 100;
        annualizedROI = ((1 + R / COMPOUND_FREQ) ** COMPOUND_FREQ - 1) * 100;
      }
      return `(Experimental) Daily ROI (Annual Weighted Avg: ${annualizedROI.toFixed(
        2,
      )}%)`;
    },
  },
};

export default function ChartConfig() {
  return null; // This component won't render anything
}
