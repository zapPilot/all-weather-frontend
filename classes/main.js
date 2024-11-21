import { ethers } from "ethers";
import { toFixedString } from "../utils/general";

export const generateIntentTxns = async (
  actionName,
  chainMetadata,
  portfolioHelper,
  accountAddress,
  tokenSymbol,
  tokenAddress,
  investmentAmount,
  tokenDecimals,
  zapOutPercentage,
  setProgress,
  setStepName,
  slippage,
  rebalancableUsdBalanceDict,
  recipient,
  protocolAssetDustInWallet,
) => {
  let txns;
  if (actionName === "zapIn") {
    txns = await portfolioHelper.portfolioAction("zapIn", {
      account: accountAddress,
      chainMetadata: chainMetadata,
      tokenInSymbol: tokenSymbol,
      tokenInAddress: tokenAddress,
      zapInAmount: ethers.utils.parseUnits(
        toFixedString(investmentAmount, tokenDecimals),
        tokenDecimals,
      ),
      progressCallback: (progressPercentage) => setProgress(progressPercentage),
      progressStepNameCallback: (stepName) => setStepName(stepName),
      slippage,
    });
  } else if (actionName === "zapOut") {
    txns = await portfolioHelper.portfolioAction("zapOut", {
      account: accountAddress,
      chainMetadata,
      tokenOutSymbol: tokenSymbol,
      tokenOutAddress: tokenAddress,
      zapOutPercentage: Number(zapOutPercentage),
      progressCallback: (progressPercentage) => setProgress(progressPercentage),
      progressStepNameCallback: (stepName) => setStepName(stepName),
      slippage,
    });
  } else if (actionName === "claimAndSwap") {
    txns = await portfolioHelper.portfolioAction(actionName, {
      account: accountAddress,
      chainMetadata,
      tokenOutAddress: tokenAddress,
      progressCallback: (progressPercentage) => setProgress(progressPercentage),
      progressStepNameCallback: (stepName) => setStepName(stepName),
      slippage,
    });
  } else if (actionName === "rebalance") {
    txns = await portfolioHelper.portfolioAction(actionName, {
      account: accountAddress,
      chainMetadata,
      progressCallback: (progressPercentage) => setProgress(progressPercentage),
      progressStepNameCallback: (stepName) => setStepName(stepName),
      slippage,
      rebalancableUsdBalanceDict,
    });
  } else if (actionName === "transfer") {
    txns = await portfolioHelper.portfolioAction(actionName, {
      account: accountAddress,
      chainMetadata,
      zapOutPercentage: Number(zapOutPercentage),
      progressCallback: (progressPercentage) => setProgress(progressPercentage),
      progressStepNameCallback: (stepName) => setStepName(stepName),
      slippage,
      recipient,
    });
  } else if (actionName === "stake") {
    txns = await portfolioHelper.portfolioAction(actionName, {
      account: accountAddress,
      chainMetadata,
      progressCallback: (progressPercentage) => setProgress(progressPercentage),
      progressStepNameCallback: (stepName) => setStepName(stepName),
      protocolAssetDustInWallet,
    });
  }

  return txns;
};
