import { getGasPrice } from "thirdweb";
import openNotificationWithIcon from "./notification.js";
import { CHAIN_ID_TO_CHAIN_STRING } from "./general.js";
import { normalizeChainName } from "./chainHelper.js";
import { getRebalanceReinvestUsdAmount } from "./portfolioCalculation.js";

/**
 * Checks if gas price is acceptable for transaction
 * @param {Object} params - Parameters for gas check
 * @param {Object} params.chainId - Chain ID object
 * @param {Object} params.THIRDWEB_CLIENT - Thirdweb client
 * @param {Function} params.notificationAPI - Notification API
 * @returns {Promise<boolean>} - Whether gas price is acceptable
 */
export const checkGasPrice = async ({
  chainId,
  THIRDWEB_CLIENT,
  notificationAPI,
}) => {
  try {
    const gasPrice = await getGasPrice({
      client: THIRDWEB_CLIENT,
      chain: chainId,
    });
    const gasPriceInGwei = Number(gasPrice) / 1e9;

    if (gasPriceInGwei > 0.05) {
      openNotificationWithIcon(
        notificationAPI,
        "Gas Price Too High",
        "error",
        `Current gas price is ${gasPriceInGwei.toFixed(
          2,
        )} gwei, please try again later.`,
      );
      return false;
    }
    return true;
  } catch (error) {
    openNotificationWithIcon(
      notificationAPI,
      "Gas Price Check Error",
      "error",
      `Failed to check gas price: ${error.message}`,
    );
    return false;
  }
};

/**
 * Prepares transaction metadata for logging
 * @param {Object} params - Transaction parameters
 * @returns {Object} - Transaction metadata
 */
export const prepareTransactionMetadata = ({
  portfolioName,
  actionName,
  tokenSymbol,
  investmentAmountAfterFee,
  zapOutPercentage,
  chainId,
  chainWeightPerYourPortfolio,
  usdBalance,
  chainWeight,
  rebalancableUsdBalanceDict,
  pendingRewards,
  portfolioHelper,
  currentChain,
  recipient,
  protocolAssetDustInWallet,
  onlyThisChain,
}) => {
  return {
    portfolioName,
    actionName,
    tokenSymbol,
    investmentAmount: investmentAmountAfterFee,
    zapOutAmount:
      actionName === "crossChainRebalance" || actionName === "localRebalance"
        ? getRebalanceReinvestUsdAmount(
            currentChain?.name,
            rebalancableUsdBalanceDict,
            pendingRewards,
            portfolioHelper,
          )
        : usdBalance * zapOutPercentage * chainWeightPerYourPortfolio,
    rebalanceAmount: getRebalanceReinvestUsdAmount(
      currentChain?.name,
      rebalancableUsdBalanceDict,
      pendingRewards,
      portfolioHelper,
    ),
    timestamp: Math.floor(Date.now() / 1000),
    swapFeeRate: portfolioHelper.swapFeeRate(),
    referralFeeRate: portfolioHelper.referralFeeRate(),
    chain: CHAIN_ID_TO_CHAIN_STRING[chainId?.id].toLowerCase(),
    zapInAmountOnThisChain: onlyThisChain
      ? investmentAmountAfterFee
      : investmentAmountAfterFee * chainWeight,
    stakeAmountOnThisChain: Object.values(
      protocolAssetDustInWallet?.[normalizeChainName(chainId?.name)] || {},
    ).reduce(
      (sum, protocolObj) => sum + (Number(protocolObj.assetUsdBalanceOf) || 0),
      0,
    ),
    transferTo: recipient,
  };
};

/**
 * Sets loading state based on action name
 * @param {Object} params - Parameters
 * @param {string} params.actionName - Name of the action
 * @param {Function} params.setZapInIsLoading - Set zap in loading state
 * @param {Function} params.setZapOutIsLoading - Set zap out loading state
 * @param {Function} params.setRebalanceIsLoading - Set rebalance loading state
 * @param {boolean} params.isLoading - Whether to set to loading or not
 */
export const setActionLoadingState = ({
  actionName,
  setZapInIsLoading,
  setZapOutIsLoading,
  setRebalanceIsLoading,
  isLoading = true,
}) => {
  if (actionName === "zapIn" || actionName === "stake") {
    setZapInIsLoading(isLoading);
  } else if (actionName === "zapOut") {
    setZapOutIsLoading(isLoading);
  } else if (
    actionName === "rebalance" ||
    actionName === "crossChainRebalance" ||
    actionName === "localRebalance"
  ) {
    setRebalanceIsLoading(isLoading);
  } else if (actionName === "claimAndSwap") {
    // placeholder for future implementation
  } else if (actionName) {
    throw new Error(`Invalid action name: ${actionName}`);
  }
};
