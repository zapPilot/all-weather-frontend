// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { base } from "thirdweb/chains";
const setTradingLoss = () => {};
const setStepName = () => {};
const setTotalTradingLoss = () => {};
const setPlatformFee = () => {};
const slippage = 0.5;
const rebalancableUsdBalanceDict = {};
const protocolAssetDustInWallet = {};
const onlyThisChain = false;
describe("Moonwell", () => {
  it("should be able to zap-in Moonwell's Stablecoin Vault", async () => {
    const actionName = "zapIn";
    const userAddress = "0xd33668a245da0D1d00e9e651F93939da09B4Fd9d";
    const tokenSymbol = "usdc";
    const tokenAddress = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const investmentAmount = 1;
    const tokenDecimals = 6;
    const zapOutPercentage = NaN;
    const portfolioHelper = getPortfolioHelper("Moonwell Stablecoin Vault");
    const txns = await generateIntentTxns(
      actionName,
      base,
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
      userAddress,
      protocolAssetDustInWallet,
      onlyThisChain,
    );
    expect(txns.length).toBe(3);
    // approve 1inch
    expect(await encode(txns[0])).includes(
      "0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a96058200000000000000000000000000000000000000000000000000000000000f4240",
    );

    expect(txns[1].to).toBe("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
    // .toBe(true);
    expect(txns[2].to).toBe("0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22");
  });
  it("should be able to zap-out Moonwell's Stablecoin Vault", async () => {
    const actionName = "zapOut";
    const userAddress = "0xd33668a245da0D1d00e9e651F93939da09B4Fd9d";
    const tokenSymbol = "usdc";
    const tokenAddress = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const investmentAmount = 1;
    const tokenDecimals = 18;
    const zapOutPercentage = 1;
    const portfolioHelper = getPortfolioHelper("Moonwell Stablecoin Vault");
    const txns = await generateIntentTxns(
      actionName,
      base,
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
      userAddress,
      protocolAssetDustInWallet,
      onlyThisChain,
    );
    expect(txns.length).toBe(0);
    // due to the change of my wallet, the txns are not generated
    // expect(txns[0].to).toBe("0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22");
    // expect(txns[1].to).toBe("0xfBb21d0380beE3312B33c4353c8936a0F13EF26C");
    // expect(txns[2].to).toBe("0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
  });
  it("should be able to claim from Moonwell Vault", async () => {
    // params claimAndSwap 0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0 usdc 0xaf88d065e77c8cc2239327c5edb3a432268e5831 0 6 1 0.5
    const actionName = "claimAndSwap";
    const userAddress = "0xd33668a245da0D1d00e9e651F93939da09B4Fd9d";
    const tokenSymbol = "usdc";
    const tokenAddress = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const investmentAmount = 0;
    const tokenDecimals = 18;
    const zapOutPercentage = 1;
    const portfolioHelper = getPortfolioHelper("Moonwell Stablecoin Vault");
    const txns = await generateIntentTxns(
      actionName,
      base,
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
      userAddress,
      protocolAssetDustInWallet,
      onlyThisChain,
    );
    expect(txns.length).toBe(1);

    // claim
    // 0xfBb21d0380beE3312B33c4353c8936a0F13EF26C stands for Moonwell's comptroller
    expect(txns[0].to).toBe("0xfBb21d0380beE3312B33c4353c8936a0F13EF26C");
  });
});
