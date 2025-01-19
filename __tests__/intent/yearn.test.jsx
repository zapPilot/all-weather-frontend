// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { arbitrum } from "thirdweb/chains";

const setTradingLoss = () => {};
const setStepName = () => {};
const setTotalTradingLoss = () => {};
const setPlatformFee = () => {};
const slippage = 0.5;
const rebalancableUsdBalanceDict = {};
const protocolAssetDustInWallet = {};

const recipient = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
const onlyThisChain = true;
describe("Yearn Vault", () => {
  it("should be able to zap-in Yearn Vault", async () => {
    const actionName = "zapIn";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 1;
    const tokenDecimals = 18;
    const zapOutPercentage = NaN;
    const portfolioHelper = getPortfolioHelper("Yearn Vault");
    const txns = await generateIntentTxns(
      actionName,
      arbitrum,
      portfolioHelper,
      userAddress,
      tokenSymbol,
      tokenAddress,
      investmentAmount,
      tokenDecimals,
      zapOutPercentage,
      setTradingLoss,
      setStepName,
      setTotalTradingLoss,
      setPlatformFee,
      slippage,
      rebalancableUsdBalanceDict,
      recipient,
      protocolAssetDustInWallet[
        arbitrum?.name.toLowerCase().replace(" one", "")
      ],
      false,
    );
    expect(txns.length).toBe(5);
    expect(await encode(txns[0])).toBe(
      "0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000de0b6b3a7640000",
    );
    expect(await encode(txns[1])).includes(
      "210050bb080155aec4eae79a2aac5fe78fd738e1",
    );
    expect(await encode(txns[2])).includes(
      "2ecbc6f229fed06044cdb0dd772437a30190cd50",
    );
    expect(await encode(txns[3])).includes(
      "0x095ea7b300000000000000000000000086df48f8dc91504d2b3e360d67513f094dfa6c84",
    );
    expect(await encode(txns[4])).includes(
      "c774806f9ff5f3d8aabb6b70d0ed509e42afe6f0",
    );
    expect(await encode(txns[4])).includes("0x6e553f65");
  });
  it("should be able to zap-in Yearn Vault + only on this chain", async () => {
    const actionName = "zapIn";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 1;
    const tokenDecimals = 18;
    const zapOutPercentage = NaN;
    const portfolioHelper = getPortfolioHelper("Yearn Vault");
    const txns = await generateIntentTxns(
      actionName,
      arbitrum,
      portfolioHelper,
      userAddress,
      tokenSymbol,
      tokenAddress,
      investmentAmount,
      tokenDecimals,
      zapOutPercentage,
      setTradingLoss,
      setStepName,
      setTotalTradingLoss,
      setPlatformFee,
      slippage,
      rebalancableUsdBalanceDict,
      recipient,
      protocolAssetDustInWallet[
        arbitrum?.name.toLowerCase().replace(" one", "")
      ],
      onlyThisChain,
    );
    expect(txns.length).toBe(3);
    expect(await encode(txns[0])).toBe(
      "0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000de0b6b3a7640000",
    );
    expect(await encode(txns[1])).includes(
      "0x095ea7b300000000000000000000000086df48f8dc91504d2b3e360d67513f094dfa6c84",
    );
    expect(await encode(txns[2])).includes(
      "c774806f9ff5f3d8aabb6b70d0ed509e42afe6f0",
    );
    expect(await encode(txns[2])).includes("0x6e553f65");
  });
  it("should be able to zap-out Yearn Vault", async () => {
    const actionName = "zapOut";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const recipientInEncodeData = "c774806f9ff5f3d8aabb6b70d0ed509e42afe6f0";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 1;
    const tokenDecimals = 18;
    const zapOutPercentage = 0.00022992956568238272;

    const portfolioHelper = getPortfolioHelper("Yearn Vault");
    const txns = await generateIntentTxns(
      actionName,
      arbitrum,
      portfolioHelper,
      userAddress,
      tokenSymbol,
      tokenAddress,
      investmentAmount,
      tokenDecimals,
      zapOutPercentage,
      setTradingLoss,
      setStepName,
      setTotalTradingLoss,
      setPlatformFee,
      slippage,
      rebalancableUsdBalanceDict,
      recipient,
      protocolAssetDustInWallet[
        arbitrum?.name.toLowerCase().replace(" one", "")
      ],
      onlyThisChain,
    );
    expect(txns.length).toBe(3);
    const encodedData = await encode(txns[0]);
    expect(encodedData.includes(recipientInEncodeData)).toBe(true);
    const occurrences = (
      encodedData.match(new RegExp(recipientInEncodeData, "gi")) || []
    ).length;
    expect(occurrences).toBe(2);
  });
});
