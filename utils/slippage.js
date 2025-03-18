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
  const { portfolioName, selectedTokenSymbol, tabLabel, actionName } = params;

  // Rebalance tab always uses 5% slippage
  if (tabLabel === "Rebalance") {
    return 5;
  }

  // Claim tab uses 3% slippage
  if (tabLabel === "Claim") {
    return 3;
  }

  // ETH/WETH for Stable+ Vault uses 3% slippage
  if (
    (selectedTokenSymbol === "eth" || selectedTokenSymbol === "weth") &&
    portfolioName === "Stable+ Vault"
  ) {
    return 3;
  }

  // ZapIn for ETH Vault or All Weather Vault uses 3% slippage
  if (
    (portfolioName === "ETH Vault" || portfolioName === "All Weather Vault") &&
    actionName === "zapIn"
  ) {
    return 3;
  }

  // Default slippage based on portfolio type
  return portfolioName?.includes("Stable") ? 2 : 3;
};