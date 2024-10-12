// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { Vela } from "../../classes/Vela/Vela";
import { BaseConvex } from "../../classes/Convex/BaseConvex";

describe("Stablecoin Vault", () => {
  it("should be able to rebalance from Stablecoin Vault", async () => {
    // params claimAndSwap 0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0 usdc 0xaf88d065e77c8cc2239327c5edb3a432268e5831 0 6 1 0.5
    const actionName = "rebalance";
    const userAddress = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
    const tokenSymbol = "";
    const tokenAddress = "";
    const investmentAmount = "";
    const tokenDecimals = "";
    const zapOutPercentage = "";
    const setProgress = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    // just a random number
    const rebalancableUsdBalanceDictDict = {
      "arbitrum/convex/0/usde-usdx": {
        weightDiff: -0.5,
        protocol: {
          interface: new BaseConvex("arbitrum", 42161, ["usde", "usdx"], "LP", {
            pid: 34,
            assetDecimals: 18,
            assetAddress: "0x096A8865367686290639bc50bF8D85C0110d9Fea",
            protocolAddress: "0x096A8865367686290639bc50bF8D85C0110d9Fea",
            convexRewardPool: "0xe062e302091f44d7483d9D6e0Da9881a0817E2be",
            lpTokens: [
              ["usde", "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34", 18],
              ["susd", "0xb2f30a7c980f052f02563fb518dcc39e6bf38175", 18],
            ],
            rewards: [
              {
                symbol: "crv",
                coinmarketcapApiId: 6538,
                address: "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
                decimals: 18,
              },
              {
                symbol: "cvx",
                coinmarketcapApiId: 9903,
                address: "0xaAFcFD42c9954C6689ef1901e03db742520829c5",
                decimals: 18,
              },
            ],
          }),
          weight: 0.5,
        },
      },
      "arbitrum/vela/0/usdc(bridged)": {
        weightDiff: 0.5,
        protocol: {
          interface: new Vela(
            "arbitrum",
            42161,
            ["usdc(bridged)"],
            "single",
            {},
          ),
          weight: 0.5,
        },
      },
    };
    const portfolioHelper = getPortfolioHelper("Stablecoin Vault");
    const txns = await generateIntentTxns(
      actionName,
      portfolioHelper,
      userAddress,
      tokenSymbol,
      tokenAddress,
      investmentAmount,
      tokenDecimals,
      zapOutPercentage,
      setProgress,
      setStepName,
      slippage,
      rebalancableUsdBalanceDictDict,
    );
  });
});
