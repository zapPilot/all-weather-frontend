// File: tokenTransfer.test.js
import { describe, it, expect } from "vitest";
import { generateIntentTxns } from "../../classes/main.js";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { encode } from "thirdweb";

describe("Referral Fee Module", () => {
  it("should send referral fee to referrer", async () => {
    const actionName = "zapIn";
    const userAddress = "0x210050bB080155AEc4EAE79a2aAC5fe78FD738E1";
    const tokenSymbol = "weth";
    const tokenAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const investmentAmount = 1;
    const tokenDecimals = 18;
    const zapOutPercentage = NaN;
    const setProgress = () => {};
    const setStepName = () => {};
    const slippage = 0.5;
    const portfolioHelper = getPortfolioHelper("Equilibria ETH Vault");
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
    );
    expect(txns.length).toBe(7);
    expect(await encode(txns[0])).toBe(
      "0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000f384cd808437080",
    );
    expect(await encode(txns[1])).toBe(
      "0xa9059cbb000000000000000000000000b1d1a96285b09203663533090118bb9f75abf92c00000000000000000000000000000000000000000000000000076f928983d000",
    );
    expect(await encode(txns[2])).toBe(
      "0xa9059cbb0000000000000000000000002ecbc6f229fed06044cdb0dd772437a30190cd5000000000000000000000000000000000000000000000000000032fd1165d1000",
    );
  });
});
