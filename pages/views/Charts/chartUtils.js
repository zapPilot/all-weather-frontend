// Constants
export const STD_DEV_THRESHOLD = 1;

// Data Processing Utilities
export const sortByDate = (data) =>
  data.sort((a, b) => new Date(a.date) - new Date(b.date));

export const calculateStdDevFilter = (data, valueKey) => {
  const values = data.map((d) => d[valueKey]).filter((v) => v !== 0);

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length,
  );

  const threshold = STD_DEV_THRESHOLD * stdDev;

  return data.map((entry) => ({
    ...entry,
    [valueKey]:
      Math.abs(entry[valueKey] - mean) > threshold ? 0 : entry[valueKey],
  }));
};

export const calculateDailyDifferences = (data) => {
  return data.map((entry, index) => ({
    date: entry.date,
    pnl: index === 0 ? 0 : entry.usd_value - data[index - 1].usd_value,
  }));
};

export const calculateDailyROI = (data) => {
  return data.map((entry, index) => {
    if (index === 0) return { date: entry.date, roi: 0 };

    const previousValue = data[index - 1].usd_value;
    if (previousValue === 0) return { date: entry.date, roi: 0 };

    const roi = ((entry.usd_value - previousValue) / previousValue) * 100;
    return {
      date: entry.date,
      roi: parseFloat(roi.toFixed(2)),
      principal: previousValue,
    };
  });
};

export default function ChartUtils() {
  return null; // This component won't render anything
}
