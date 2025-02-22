import { fetchSwapData } from "./oneInch";
import { approve } from "./general";
import { prepareTransaction } from "thirdweb";
import { ethers } from "ethers";
import { CHAIN_ID_TO_CHAIN } from "./general";
import THIRDWEB_CLIENT from "./thirdweb";

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
        );
        if (Object.values(swapCallData).length === 0) {
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
          gasFee: swapCallData["gasFee"],
          tradingLoss,
          inputValue,
          transactions: [
            approveTxn,
            prepareTransaction({
              to: swapCallData["to"],
              chain: CHAIN_ID_TO_CHAIN[chainId],
              client: THIRDWEB_CLIENT,
              data: swapCallData["data"],
              extraGas: BigInt(swapCallData["gasFee"]),
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

  // Sort first by toAmount (descending) then by gasFee (ascending)
  const bestSwap = validSwaps.sort((a, b) => {
    if (a.minToAmount === b.minToAmount) {
      return Number(a.gasFee - b.gasFee); // Lower gas fee is better
    }
    return Number(b.minToAmount - a.minToAmount); // Higher return amount is better
  })[0];
  // Update progress with final trading loss/gain
  await updateProgressAndWaitCallback(
    updateProgress,
    `${protocolUniqueId}-${fromToken}-${toTokenSymbol}-swap`,
    bestSwap.tradingLoss,
  );

  return [bestSwap.transactions, bestSwap.minToAmount];
}
export default swap;
