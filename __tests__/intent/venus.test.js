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
      protocolAssetDustInWallet,
      onlyThisChain,
    );

    console.log("Generated transactions:", JSON.stringify(txns, null, 2));

    expect(txns).toBeDefined();
    expect(Array.isArray(txns)).toBe(true);
    
    for (const tx of txns) {
      const data = await tx.data();
      console.log("Transaction data:", data);

      expect(tx).toHaveProperty('to');
      expect(tx).toHaveProperty('data');
      expect(tx.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(data).toMatch(/^0x[a-fA-F0-9]*$/);
    }

    if (txns.length > 0) {
      const firstTx = txns[0];
      const firstTxData = await firstTx.data();
      expect(firstTx.to.toLowerCase()).toBe(tokenAddress.toLowerCase());
      
      if (firstTxData.startsWith('0x095ea7b3')) {
        expect(firstTxData.length).toBeGreaterThan(10);
      }
    }

    expect(txns.length).toBe(2);

    const approveTx = txns[0];
    const depositTx = txns[1];

    const approveTxData = await approveTx.data();
    const depositTxData = await depositTx.data();

    expect(approveTx.to.toLowerCase()).toBe(tokenAddress.toLowerCase());
    expect(approveTxData.startsWith('0x095ea7b3')).toBe(true);

    expect(depositTxData.startsWith('0xa0712d68')).toBe(true);

    console.log({
      approveTx: {
        to: approveTx.to,
        method: approveTxData.slice(0, 10)
      },
      depositTx: {
        to: depositTx.to,
        method: depositTxData.slice(0, 10)
      }
    });
  });
});

