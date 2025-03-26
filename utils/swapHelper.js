import { fetchSwapData } from "./oneInch";
import { approve } from "./general";
import { prepareTransaction } from "thirdweb";
import { ethers } from "ethers";
import { CHAIN_ID_TO_CHAIN } from "./general";
import THIRDWEB_CLIENT from "./thirdweb";
import assert from "assert";
async function swap(
  walletAddress,
  chainId,
  protocolUniqueId,
  updateProgressAndWaitCallback,
  fromTokenAddress,
  toTokenAddress,
  amount,
  slippage,
  updateProgress,
  fromToken,
  fromTokenDecimals,
  toTokenSymbol,
  toTokenDecimals,
  tokenPricesMappingTable,
) {
  if (fromTokenAddress.toLowerCase() === toTokenAddress.toLowerCase()) {
    return;
  }

  // Try all providers and collect their swap data
  const providers = ["1inch", "0x", "paraswap"];
  const eth_price = tokenPricesMappingTable["eth"];
  const to_token_price = tokenPricesMappingTable[toTokenSymbol];
  const to_token_decimals = toTokenDecimals;
  const swapResults = await Promise.all(
    providers.map(async (provider) => {
      try {
        const swapCallData = await fetchSwapData(
          chainId,
          fromTokenAddress,
          toTokenAddress,
          amount,
          walletAddress,
          slippage,
          provider,
          fromTokenDecimals,
          toTokenDecimals,
          eth_price,
          to_token_price,
          to_token_decimals,
        );
        if (
          Object.values(swapCallData).length === 0 ||
          "error" in swapCallData
        ) {
          if ("error" in swapCallData) {
            console.warn(`${provider} swap failed:`, swapCallData.error);
          }
          return null;
        }
        const normalizedInputAmount = ethers.utils.formatUnits(
          amount,
          fromTokenDecimals,
        );
        const normalizedOutputAmount = ethers.utils.formatUnits(
          swapCallData["toAmount"],
          toTokenDecimals,
        );
        const inputValue =
          Number(normalizedInputAmount) * tokenPricesMappingTable[fromToken];
        const outputValue =
          Number(normalizedOutputAmount) *
          tokenPricesMappingTable[toTokenSymbol];
        const tradingLoss = outputValue - inputValue;

        const approveTxn = approve(
          fromTokenAddress,
          swapCallData["approve_to"],
          amount,
          () => {},
          chainId,
        );

        return {
          provider,
          swapData: swapCallData,
          minToAmount: swapCallData["minToAmount"],
          gasCostUSD: swapCallData["gasCostUSD"],
          tradingLoss,
          inputValue,
          normalizedInputAmount,
          normalizedOutputAmount,
          toUsd: swapCallData["toUsd"],
          transactions: [
            approveTxn,
            prepareTransaction({
              to: swapCallData["to"],
              chain: CHAIN_ID_TO_CHAIN[chainId],
              client: THIRDWEB_CLIENT,
              data: swapCallData["data"],
              extraGas: BigInt(swapCallData["gas"]),
            }),
          ],
        };
      } catch (error) {
        console.warn(`Failed to fetch swap data from ${provider}:`, error);
        return null;
      }
    }),
  );

  // Filter out failed attempts and sort by best return and gas fee
  const validSwaps = swapResults.filter((result) => result !== null);
  if (validSwaps.length === 0) {
    throw new Error("No valid swap data found from any provider");
  }

  // New sorting logic
  let bestSwap;

  // Check if all swaps have valid toUsd values
  const allHaveValidToUsd = validSwaps.every(
    (swap) => swap.toUsd && Number(swap.toUsd) > 0,
  );

  if (allHaveValidToUsd) {
    // Sort by toUsd (descending)
    bestSwap = validSwaps.sort((a, b) => {
      return Number(b.toUsd) - Number(a.toUsd); // Higher USD value is better
    })[0];
  } else {
    // Fall back to minToAmount
    bestSwap = validSwaps.sort((a, b) => {
      const aNetValue = Number(a.minToAmount);
      const bNetValue = Number(b.minToAmount);
      return bNetValue - aNetValue; // Higher net value is better
    })[0];
  }

  // Check slippage for the best quote only
  const actualPrice =
    (bestSwap.normalizedOutputAmount * tokenPricesMappingTable[toTokenSymbol]) /
    (bestSwap.normalizedInputAmount * tokenPricesMappingTable[fromToken]);
  const slippagePercentage = (1 - actualPrice) * 100;
  if (process.env.TEST !== "true") {
    assert(
      slippagePercentage <= slippage,
      `Slippage is too high to swap ${fromToken} to ${toTokenSymbol}. Slippage: ${slippagePercentage.toFixed(
        2,
      )}%, Max allowed: ${slippage}%`,
    );
  }
  // Update progress with final trading loss/gain
  await updateProgressAndWaitCallback(
    updateProgress,
    `${protocolUniqueId}-${fromToken}-${toTokenSymbol}-swap`,
    bestSwap.tradingLoss,
  );
  return [bestSwap.transactions, bestSwap.minToAmount];
}
export default swap;
