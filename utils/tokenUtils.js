/**
 * Utility functions for token filtering and sorting
 */

/**
 * Filters and sorts tokens by their total value (price * amount)
 * Removes tokens with zero or negative price and sorts by descending value
 * @param {Array} tokens - Array of token objects with amount and price properties
 * @returns {Array} Filtered and sorted array of tokens
 */
export const getFilteredAndSortedTokens = (tokens) => {
  if (!tokens?.length) return [];
  return tokens
    .filter((token) => token.price > 0)
    .sort((a, b) => b.amount * b.price - a.amount * a.price);
};

/**
 * Calculates the total USD value of a token array
 * @param {Array} tokens - Array of token objects with amount and price properties
 * @returns {number} Total USD value of all tokens
 */
export const calculateTotalTokenValue = (tokens) => {
  if (!tokens?.length) return 0;
  return tokens.reduce((sum, token) => sum + token.amount * token.price, 0);
};

/**
 * Gets the optimized symbol for a token (fallback to original symbol)
 * @param {Object} token - Token object with symbol and optional optimized_symbol
 * @returns {string} The token symbol to display
 */
export const getTokenSymbol = (token) => {
  return token.optimized_symbol || token.symbol;
};
