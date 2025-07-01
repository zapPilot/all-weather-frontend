import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { convertToObject } from "typescript";

describe("Venus", () => {
  it("should be able to zap-in Venus's Stablecoin Vault", async () => {
    const actionName = "zapIn";
    const userAddress = "0x39551EC839f10C235ec8DB062A93e89d3c0E6134";
    const tokenSymbol = "usdc";
    const tokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    const investmentAmount = 1;
    const tokenDecimals = 6;
    const zapOutPercentage = NaN;
    const portfolioHelper = getPortfolioHelper("Venus Stablecoin Vault");

    const setTradingLoss = () => {};
    const setStepName = () => {};
    const setTotalTradingLoss = () => {};
    const setPlatformFee = () => {};

    const slippage = 0.5;
    const rebalancableUsdBalanceDict = {};
    const protocolAssetDustInWallet = {};
    const onlyThisChain = true;

    const txns = await generateIntentTxns({
      actionName,
      chainMetadata: arbitrum,
      portfolioHelper,
      accountAddress: userAddress,
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
      recipient: userAddress,
      protocolAssetDustInWallet,
      onlyThisChain,
    });

    expect(txns).toBeDefined();
    expect(Array.isArray(txns)).toBe(true);

    for (const tx of txns) {
      const data = await tx.data();

      expect(tx).toHaveProperty("to");
      expect(tx).toHaveProperty("data");
      expect(tx.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(data).toMatch(/^0x[a-fA-F0-9]*$/);
    }

    if (txns.length > 0) {
      const firstTx = txns[0];
      const firstTxData = await firstTx.data();
      expect(firstTx.to.toLowerCase()).toBe(tokenAddress.toLowerCase());

      if (firstTxData.startsWith("0x095ea7b3")) {
        expect(firstTxData.length).toBeGreaterThan(10);
      }
    }

    expect(txns.length).toBe(4);

    const approveTx = txns[0];
    const depositTx = txns[1];
    const approveTxData = await approveTx.data();
    const depositTxData = await depositTx.data();

    expect(approveTx.to.toLowerCase()).toBe(tokenAddress.toLowerCase());
    expect(approveTxData.startsWith("0x095ea7b3")).toBe(true);
    expect(depositTxData.startsWith("0xa0712d68")).toBe(true);
  });

  it("should be able to zap-out Venus's Stablecoin Vault", async () => {
    const actionName = "zapOut";
    const userAddress = "0xda168b9d32c91e8b516180be1a1af3af1531cd6f";
    const tokenSymbol = "usdc";
    const tokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    const investmentAmount = 1;
    const zapOutPercentage = 0.1;
    const tokenDecimals = 6;
    const portfolioHelper = getPortfolioHelper("Venus Stablecoin Vault");
    const setTradingLoss = () => {};
    const setStepName = () => {};
    const setTotalTradingLoss = () => {};
    const setPlatformFee = () => {};
    const slippage = 0.5;
    const rebalancableUsdBalanceDict = {};
    const protocolAssetDustInWallet = {};
    const onlyThisChain = true;
    const protocolContract = "0x7d8609f8da70ff9027e9bc5229af4f6727662707";
    const assetContract = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

    const txns = await generateIntentTxns({
      actionName,
      chainMetadata: arbitrum,
      portfolioHelper,
      accountAddress: userAddress,
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
      recipient: userAddress,
      protocolAssetDustInWallet,
      onlyThisChain,
    });

    expect(txns).toBeDefined();
    expect(Array.isArray(txns)).toBe(true);
    expect(txns.length).toBeGreaterThan(0);
    expect(txns.length).toBe(1);
    const redeemTx = txns[0];
    const redeemTxData = await redeemTx.data();

    expect(redeemTxData.startsWith("0xdb006a75")).toBe(true);
  });
});
