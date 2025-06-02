/**
 * Determines the appropriate slippage percentage based on various parameters
 * @param {Object} params - Parameters to determine slippage
 * @param {string} params.portfolioName - The name of the portfolio
 * @param {string} params.selectedTokenSymbol - The selected token symbol
 * @param {string} params.tabLabel - The current tab label
 * @param {string} params.actionName - The current action name
 * @returns {number} The appropriate slippage percentage
 */
export const determineSlippage = (params) => {
  const { portfolioName, selectedTokenSymbol, key, actionName } = params;

  // Rebalance tab always uses 5% slippage
  // Claim tab uses 3% slippage
  if (!["1", "2"].includes(key) && portfolioName !== "Stable+ Vault") {
    return 3;
  }
  if (key === "5") {
    return 50;
  }

  // ETH/WETH for Stable+ Vault uses 3% slippage
  if (
    (selectedTokenSymbol === "eth" || selectedTokenSymbol === "weth") &&
    portfolioName === "Stable+ Vault"
  ) {
    return 2;
  }

  // ZapIn for ETH Vault or Index 500 Vault uses 3% slippage
  if (
    (portfolioName === "ETH Vault" || portfolioName === "Index 500 Vault") &&
    actionName === "zapIn"
  ) {
    return 3;
  }

  // Default slippage based on portfolio type
  // return portfolioName?.includes("Stable") ? 2 : 3;
  return 3;
};
