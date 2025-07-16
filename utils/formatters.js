/**
 * Utility functions for formatting numbers and values
 */

/**
 * Formats small numbers with appropriate precision
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export const formatSmallNumber = (num) => {
  const n = Number(num);
  if (isNaN(n)) return "-";
  if (n < 0.000001 && n > 0) return "< 0.000001";
  return Number(n.toFixed(6)).toString();
};

/**
 * Formats ETH amounts with appropriate precision based on value size
 * @param {number} value - The ETH amount to format
 * @returns {string} Formatted ETH amount string
 */
export const formatEthAmount = (value) => {
  if (!value) return "0.0000";
  if (value >= 1) return value.toFixed(4);
  if (value >= 0.001) return value.toFixed(6);
  return value.toFixed(8);
};

/**
 * Formats USD values with appropriate precision
 * @param {number} value - The USD value to format
 * @returns {string} Formatted USD value string
 */
export const formatValue = (value) => {
  if (!value) return "0.00";
  return value.toFixed(2);
};
