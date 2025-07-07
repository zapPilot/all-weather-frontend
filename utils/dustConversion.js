import logger from "./logger";
import { ethers } from "ethers";
import swap from "./swapHelper";
const BATCH_SIZE = 10; // Process 3 tokens at a time to avoid rate limits
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

/**
 * Fetches swap routes for a batch of tokens
 * @param {Object} params
 * @param {Array} params.tokens - Array of token objects to convert
 * @param {string} params.chainName - Chain name
 * @param {string} params.accountAddress - User's wallet address
 * @param {Object} params.tokenPricesMappingTable - Token prices mapping
 * @returns {Promise<Object>} Object mapping token addresses to their swap routes
 */
export const fetchDustConversionRoutes = async ({
  tokens,
  chainId,
  accountAddress,
  tokenPricesMappingTable,
  slippage,
  handleStatusUpdate,
}) => {
  const allTxns = [];
  let totalTradingLoss = 0;
  // Process tokens in batches
  // Ambire wallet cannot support too large batch
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    // Process each batch concurrently
    const batchPromises = batch.map(async (token) => {
      try {
        const fromTokenSymbol = token.optimized_symbol.toLowerCase();
        // Update price mapping for this token
        const updatedPriceMapping = {
          ...tokenPricesMappingTable,
          [fromTokenSymbol]: token.price,
        };
        const [txns, _, tradingLoss] = await swap(
          accountAddress,
          chainId,
          "placeHolder",
          () => {},
          token.id, // fromTokenAddress
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // toTokenAddress (ETH)
          ethers.BigNumber.from(token.raw_amount_hex_str),
          slippage, // slippage percentage
          null, // updateProgress callback
          fromTokenSymbol,
          token.decimals,
          "eth", // toTokenSymbol
          18, // toTokenDecimals (ETH)
          updatedPriceMapping,
          handleStatusUpdate,
        );
        return [txns, tradingLoss];
      } catch (err) {
        logger.error(`Failed to fetch route for ${token.symbol}:`, err);
        return [[], 0];
      }
    });

    const batchResults = await Promise.all(batchPromises);
    // Process each result to collect transactions and trading loss
    batchResults.forEach(([txns, tradingLoss]) => {
      allTxns.push(...txns);
      totalTradingLoss += tradingLoss;
    });

    // Wait before processing next batch
    if (i + BATCH_SIZE < tokens.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_BATCHES),
      );
    }
  }

  return [allTxns, totalTradingLoss];
};

/**
 * Main function to handle dust conversion
 * @param {Object} params
 * @param {Array} params.tokens - Array of token objects to convert
 * @param {string} params.chainName - Chain name
 * @param {string} params.accountAddress - User's wallet address
 * @param {Object} params.tokenPricesMappingTable - Token prices mapping
 * @returns {Promise<{success: boolean, txns: Array, error?: string}>}
 */
export const handleDustConversion = async ({
  chainId,
  chainName,
  accountAddress,
  tokenPricesMappingTable,
  slippage,
  handleStatusUpdate,
}) => {
  try {
    const tokens = await getTokens(chainName, accountAddress);
    // Step 1: Fetch routes
    const [txns, totalTradingLoss] = await fetchDustConversionRoutes({
      tokens,
      chainId,
      accountAddress,
      tokenPricesMappingTable,
      slippage,
      handleStatusUpdate,
    });
    console.log("txns", txns);
    return txns;
  } catch (error) {
    logger.error("Dust conversion failed:", error);
    return [];
  }
};

export const getTokens = async (chainName, accountAddress) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/user/${accountAddress}/${chainName}/tokens`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch tokens");
  }
  const data = await response.json();
  const filteredAndSortedTokens = data
    ? data
        .filter((token) => token.price > 0)
        .filter(
          (token) =>
            !token.optimized_symbol.toLowerCase().includes("-") &&
            !token.optimized_symbol.toLowerCase().includes("/") &&
            token.optimized_symbol.toLowerCase() !== "usdc" &&
            token.optimized_symbol.toLowerCase() !== "usdt" &&
            token.optimized_symbol.toLowerCase() !== "eth" &&
            token.optimized_symbol.toLowerCase() !== "alp",
        )
        .filter((token) => !token.protocol_id.includes("aave"))
        .filter((token) => token.amount * token.price > 0.005)
        .sort((a, b) => b.amount * b.price - a.amount * a.price)
    : [];
  return filteredAndSortedTokens;
};
