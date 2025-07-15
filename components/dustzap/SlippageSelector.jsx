import React, { useState } from "react";
import { Select, Tooltip, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { Option } = Select;

/**
 * SlippageSelector component - allows users to select slippage tolerance
 * @param {Object} props
 * @param {number} props.slippage - Current slippage value
 * @param {function} props.onChange - Callback when slippage changes
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} SlippageSelector component
 */
const SlippageSelector = ({ slippage, onChange, className = "" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const slippageOptions = [
    { value: 1, label: "1%" },
    { value: 5, label: "5%" },
    { value: 10, label: "10%" },
    { value: 20, label: "20%" },
    { value: 30, label: "30%" },
  ];

  return (
    <div className={`${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span>Slippage: {slippage}%</span>
        <Tooltip
          title="High slippage (30%) is recommended for dust tokens due to poor liquidity. Since dust values are small, the trading loss is minimal compared to successful conversion."
          placement="top"
        >
          <InfoCircleOutlined className="w-3 h-3 cursor-help text-gray-400 hover:text-gray-600" />
        </Tooltip>
        <svg
          className={`w-3 h-3 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
          <div className="mb-2">
            <Text className="text-xs font-medium text-gray-600">
              Slippage Tolerance
            </Text>
          </div>
          <Select
            value={slippage}
            onChange={onChange}
            className="w-full"
            size="small"
            placeholder="Select tolerance"
          >
            {slippageOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
          <div className="mt-1">
            <Text className="text-xs text-gray-400">
              Higher values allow conversion during price volatility
            </Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlippageSelector;
