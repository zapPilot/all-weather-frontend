import {
  MINIMUM_PROTOCOL_ZAP_IN_USD_THRESHOLD,
  MINIMUM_BRIDGE_USD_THRESHOLD,
} from "../config/minimumThresholds";

export const getMinimumTokenAmount = (
  selectedToken,
  shouldSkipBridge,
  portfolioHelper,
  tokenPricesMappingTable,
  currentChain,
) => {
  const tokenSymbol = selectedToken?.split("-")?.[0]?.toLowerCase();

  // Get the token price from the mapping table
  const tokenPrice = tokenPricesMappingTable?.[tokenSymbol];

  // Find the protocol with the smallest weight in the current chain
  let smallestWeight = Infinity;
  let sumOfWeights = 0;
  let destinationChainWeights = {};

  if (portfolioHelper?.strategy) {
    // Iterate through the nested structure
    for (const [category, chains] of Object.entries(portfolioHelper.strategy)) {
      // If shouldSkipBridge is true, only consider the current chain
      const chainsToConsider = shouldSkipBridge
        ? [currentChain]
        : Object.keys(chains);

      for (const chain of chainsToConsider) {
        if (chains[chain]) {
          for (const protocol of chains[chain]) {
            // Update smallest weight if this protocol has a smaller weight
            if (protocol.weight < smallestWeight && protocol.weight !== 0) {
              smallestWeight = protocol.weight;
            }
            // Only sum weights if we're in single chain mode (shouldSkipBridge is true)
            if (shouldSkipBridge) {
              sumOfWeights += protocol.weight;
            }
            // Track weights for each destination chain
            if (!shouldSkipBridge) {
              destinationChainWeights[chain] =
                (destinationChainWeights[chain] || 0) + protocol.weight;
            }
          }
        }
      }
    }
  }

  // If no protocol was found, use default value
  if (smallestWeight === Infinity) {
    smallestWeight = 1;
  }

  if (sumOfWeights === 0) {
    sumOfWeights = 1;
  }

  // Calculate the minimum token amount based on the formula
  // For single chain mode (shouldSkipBridge is true), normalize the weight
  // For cross chain mode, use raw weight
  const normalizedSmallestWeight = shouldSkipBridge
    ? smallestWeight / sumOfWeights
    : smallestWeight;

  // Calculate minimum zap-in amount based on protocol weight
  console.log(
    "normalizedSmallestWeight",
    normalizedSmallestWeight,
    "MINIMUM_PROTOCOL_ZAP_IN_USD_THRESHOLD",
    MINIMUM_PROTOCOL_ZAP_IN_USD_THRESHOLD,
  );
  const protocolMinZapInUSD =
    MINIMUM_PROTOCOL_ZAP_IN_USD_THRESHOLD / normalizedSmallestWeight;
  // If we're in cross chain mode, we need to consider the bridge threshold for each destination chain
  let minimumZapInAmountUSD = protocolMinZapInUSD;
  if (!shouldSkipBridge) {
    // Normalize destination chain weights
    const totalChainWeight = Object.values(destinationChainWeights).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    const normalizedDestinationChainWeights = Object.fromEntries(
      Object.entries(destinationChainWeights).map(([chain, weight]) => [
        chain,
        weight / totalChainWeight,
      ]),
    );

    // Calculate the minimum amount needed for each destination chain to meet the bridge threshold
    const bridgeMinimums = Object.entries(normalizedDestinationChainWeights)
      .map(([chain, weight]) => {
        // If weight is 0, skip this chain
        if (weight === 0) return 0;
        // Calculate minimum amount needed to meet bridge threshold for this chain
        return MINIMUM_BRIDGE_USD_THRESHOLD / weight;
      })
      .filter((amount) => amount > 0);
    // Take the maximum of all minimums
    console.log(
      "bridgeMinimums",
      bridgeMinimums,
      "protocolMinZapInUSD",
      protocolMinZapInUSD,
    );
    if (bridgeMinimums.length > 0) {
      minimumZapInAmountUSD = Math.max(protocolMinZapInUSD, ...bridgeMinimums);
    }
  }
  console.log("minimumZapInAmountUSD", minimumZapInAmountUSD);
  // Convert to token amount
  const minimumTokenAmount = minimumZapInAmountUSD / tokenPrice;

  return minimumTokenAmount;
};
