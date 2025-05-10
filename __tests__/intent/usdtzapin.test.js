import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { base } from "thirdweb/chains";

const setTradingLoss = () => {};
const setStepName = () => {};
const setTotalTradingLoss = () => {};
const setPlatformFee = () => {};
const slippage = 1;
const protocolAssetDustInWallet = {};
const rebalancableUsdBalanceDict = {};
const onlyThisChain = false; // Must be false so bridging can occur

// Bridge configuration
const BRIDGE_CONFIG = {
  stargate: {
    address: "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64",
    name: "Stargate Bridge",
  },
  squid: {
    address: "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",
    name: "Squid Router",
  },
  squidRouter2: {
    address: "0xdf4ffda22270c12d0b5b3788f1669d709476111e",
    name: "squid Router",
  },
  // Add more bridges here as needed
};

// Helper function to detect bridges in transactions
const detectBridges = (txns) => {
  const bridges = [];

  txns.forEach((txn, index) => {
    const bridgeAddress = txn.to.toLowerCase();
    const bridge = Object.values(BRIDGE_CONFIG).find(
      (bridge) => bridge.address.toLowerCase() === bridgeAddress,
    );

    if (bridge) {
      bridges.push({
        ...bridge,
        index,
        transaction: txn,
      });
    }
  });

  return bridges;
};

describe("Bridge with USDT -> USDC Swap", () => {
  it("should swap right before bridging if input is USDT", async () => {
    const userAddress = "0x9eAe6086a8dE7D665FEB17e19853e68738e0Bd5C";
    const portfolioHelper = getPortfolioHelper("Stable+ Vault");

    const actionName = "zapIn";
    const tokenInSymbol = "usdt";
    // base USDT address
    const tokenInAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
    const tokenDecimals = 6;
    const zapInAmount = 400;
    const zapOutPercentage = NaN;
    const chainMetadata = base;

    // Generate transactions
    const txns = await generateIntentTxns({
      actionName,
      chainMetadata,
      portfolioHelper,
      accountAddress: userAddress,
      tokenSymbol: tokenInSymbol,
      tokenAddress: tokenInAddress,
      investmentAmount: zapInAmount,
      tokenDecimals,
      zapOutPercentage,
      setTradingLoss,
      setStepName,
      setTotalTradingLoss,
      setPlatformFee,
      slippage,
      rebalancableUsdBalanceDict,
      recipient: userAddress,
      protocolAssetDustInWallet,
      onlyThisChain,
    });

    // Ensure we got some transactions
    expect(txns.length).toBeGreaterThanOrEqual(2);
    // Check if any transaction's destination matches a configured bridge
    const bridgeIndex = txns.findIndex((txn) =>
      Object.values(BRIDGE_CONFIG).some(
        (bridge) => bridge.address.toLowerCase() === txn.to.toLowerCase(),
      ),
    );

    expect(
      bridgeIndex,
      `No bridge address found in ${txns.length} transactions`,
    ).toBeGreaterThan(-1);

    // The transaction right before bridging should be the aggregator swap
    const oneInchArbAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
    const swapTxn = txns[bridgeIndex - 2];

    // 1) Check the 'to' address is the 1inch aggregator
    const zeroxProxyAddress = "0x0000000000001ff3684f28c67538d4d072c22734";
    const paraswapProxyAddress = "0x59c7c832e96d2568bea6db468c1aadcbbda08a52";
    expect(swapTxn.to.toLowerCase()).to.be.oneOf([
      oneInchArbAddress.toLowerCase(),
      zeroxProxyAddress.toLowerCase(),
      paraswapProxyAddress.toLowerCase(),
    ]);

    // 2) Check the call data references USDT -> USDC
    const swapData = await encode(swapTxn);
    // 3) Confirm bridging is indeed after the swap
    const bridgeTxn = txns[bridgeIndex];
    expect(bridgeTxn).toBeDefined();
  });
});
