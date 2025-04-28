import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { categoryMapping } from "../../pages/portfolio/PortfolioComposition";
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

export default function CategoryPieChart({ data }) {
  return (
    <div className="h-[200px] mb-8">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${value.toFixed(1)}%`}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "none",
              borderRadius: "4px",
              color: "black",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{
              paddingTop: "20px",
              color: "white",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
// Calculate category weights for pie chart
export const getCategoryWeights = (organizeByCategory, portfolioHelper) => {
  const categoryMap = organizeByCategory(portfolioHelper);
  const weights = [];

  Array.from(categoryMap).forEach(([category, chainProtocolMap]) => {
    const allProtocols = Array.from(chainProtocolMap.values()).flat();
    const totalWeight = allProtocols.reduce(
      (sum, protocol) => sum + protocol.weight,
      0,
    );
    if (totalWeight > 0) {
      weights.push({
        name: categoryMapping[category],
        value: totalWeight * 100,
      });
    }
  });
  return weights;
};
