/**
 * Normalizes a chain name by removing common suffixes
 * @param {string} chainName - The chain name to normalize
 * @returns {string} The normalized chain name
 */
export const normalizeChainName = (chainName) => {
  if (!chainName) return "";
  return chainName
    .toLowerCase()
    .replace(" one", "")
    .replace(" mainnet", "")
    .trim();
};

export const transformToDebankChainName = (chainName) => {
  const chainNameToDebankChainName = {
    ethereum: "eth",
    "arbitrum one": "arb",
    bsc: "bsc",
    base: "base",
    "op mainnet": "op",
  };
  return chainNameToDebankChainName[chainName] || chainName;
};

/**
 * Calculates the investment amount for a specific chain based on portfolio strategy
 * @param {string} chainName - The chain name
 * @param {Object} portfolioHelper - The portfolio helper instance
 * @returns {number} The calculated investment amount weight
 */
export const calCrossChainInvestmentAmount = (chainName, portfolioHelper) => {
  if (portfolioHelper?.strategy === undefined) return 0;

  const normalizedChain = normalizeChainName(chainName);

  return Object.entries(portfolioHelper.strategy).reduce(
    (sum, [category, protocols]) => {
      return (
        sum +
        Object.entries(protocols).reduce((innerSum, [chain, protocolArray]) => {
          if (normalizeChainName(chain) === normalizedChain) {
            return (
              innerSum +
              protocolArray.reduce((weightSum, protocol) => {
                return weightSum + Number(protocol.weight);
              }, 0)
            );
          }
          return innerSum;
        }, 0)
      );
    },
    0,
  );
};

/**
 * Gets all available chains from a portfolio strategy
 * @param {Object} portfolioHelper - The portfolio helper instance
 * @returns {string[]} Array of available chain names
 */
export const getAvailableAssetChains = (portfolioHelper) => {
  if (!portfolioHelper?.strategy) return [];

  return [
    ...new Set(
      Object.entries(portfolioHelper.strategy).flatMap(
        ([category, protocols]) =>
          Object.entries(protocols).map(([chain, protocolArray]) => chain),
      ),
    ),
  ];
};
