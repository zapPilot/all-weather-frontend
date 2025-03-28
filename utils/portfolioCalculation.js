/**
 * Calculates the rebalance reinvest USD amount for a specific chain
 * @param {string} chainFilter - The chain to filter by
 * @param {Object} rebalancableUsdBalanceDict - The rebalancable USD balance dictionary
 * @param {Object} pendingRewards - The pending rewards
 * @param {Object} portfolioHelper - The portfolio helper instance
 * @returns {number} The calculated USD amount
 */
export const getRebalanceReinvestUsdAmount = (
  chainFilter,
  rebalancableUsdBalanceDict,
  pendingRewards,
  portfolioHelper,
) => {
  const chain = chainFilter
    ?.replace(" one", "")
    .replace(" mainnet", "")
    .toLowerCase();

  if (chain === undefined) return 0;

  const filteredBalances = chain
    ? Object.values(rebalancableUsdBalanceDict).filter(
        (item) => item.chain === chain,
      )
    : Object.values(rebalancableUsdBalanceDict);

  const result =
    filteredBalances.reduce((sum, { usdBalance, zapOutPercentage }) => {
      return zapOutPercentage > 0 ? sum + usdBalance * zapOutPercentage : sum;
    }, 0) + portfolioHelper?.sumUsdDenominatedValues(pendingRewards);

  return result;
};

/**
 * Gets token metadata from the tokens list
 * @param {Object} chainId - The chain ID object
 * @param {string} tokenSymbol - The token symbol
 * @param {Object} tokens - The tokens list
 * @returns {string|null} The token metadata string or null
 */
export const getTokenMetadata = (chainId, tokenSymbol, tokens) => {
  if (!chainId) return null;

  const chainTokens =
    tokens.props.pageProps.tokenList[String(chainId?.id)] || [];
  if (!Array.isArray(chainTokens)) {
    return null;
  }

  const token = chainTokens.find(
    (token) => token.symbol?.toLowerCase() === tokenSymbol.toLowerCase(),
  );

  if (!token) {
    return null;
  }

  return `${token.symbol}-${token.value}-${token.decimals}`;
};
