import { ethers } from "ethers";
import { fetch1InchSwapData, oneInchAddress } from "../utils/oneInch.js";
import { PROVIDER } from "../utils/general.js";
import { arbitrum } from "thirdweb/chains";
import { ERC20_ABI } from "../node_modules/@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import BaseUniswap from "./uniswapv3/BaseUniswap.js";
import assert from "assert";
import THIRDWEB_CLIENT from "../utils/thirdweb";
import { getTokenDecimal, approve } from "../utils/general";
import { prepareTransaction } from "thirdweb";

export default class BaseProtocol extends BaseUniswap {
  // arbitrum's Apollox is staked on PancakeSwap
  constructor(chain, chaindId, symbolList, mode, customParams) {
    super();
    this.protocolName = "placeholder";
    this.protocolVersion = "placeholder";
    this.assetDecimals = "placeholder";
    this.assetContract = "placeholder";
    this.protocolContract = "placeholder";
    this.stakeFarmContract = "placeholder";

    this.chain = chain;
    this.chainId = chaindId;
    this.symbolList = symbolList;
    this.mode = mode;
    this.customParams = customParams;
    assert(chain !== undefined, "chain is not set");
    assert(chaindId !== undefined, "chainId is not set");
    assert(symbolList !== undefined, "symbolList is not set");
    assert(mode !== undefined, "mode is not set");
    assert(customParams !== undefined, "customParams is not set");
  }
  uniqueId() {
    return `${this.chain}/${this.protocolName}/${
      this.protocolVersion
    }/${this.symbolList.join("-")}`;
  }
  toString() {
    // If the symbolList is too long, it will be truncated
    const maxSymbols = 2; // Define the maximum number of symbols to show
    const symbolList =
      this.symbolList.length > maxSymbols
        ? `${this.symbolList.slice(0, maxSymbols).join("-")}-...`
        : this.symbolList.join("-");
    return `${this.chain}/${this.protocolName}/${symbolList}`;
  }
  rewards() {
    throw new Error("Method 'rewards()' must be implemented.");
  }
  _checkIfParamsAreSet() {
    assert(this.protocolName !== "placeholder", "protocolName is not set");
    assert(
      this.protocolVersion !== "placeholder",
      "protocolVersion is not set",
    );
    assert(this.assetDecimals !== "placeholder", "assetDecimals is not set");
    assert(typeof this.assetContract === "object", "assetContract is not set");
    assert(
      typeof this.protocolContract === "object",
      "assetContract is not set",
    );
    assert(
      typeof this.stakeFarmContract === "object",
      "assetContract is not set",
    );
  }

  zapInSteps(tokenInAddress) {
    // TODO: we can use `tokenInAddress` to dynamically determine the steps
    // if the user is using the best token to zap in, then the step would be less than others (no need to swap)
    throw new Error("Method 'zapInSteps()' must be implemented.");
  }
  zapOutSteps(tokenOutAddress) {
    throw new Error("Method 'zapOutSteps()' must be implemented.");
  }
  claimAndSwapSteps() {
    throw new Error("Method 'claimAndSwapSteps()' must be implemented.");
  }
  rebalanceSteps() {
    throw new Error("Method 'rebalanceSteps()' must be implemented.");
  }
  async usdBalanceOf(address) {
    throw new Error("Method 'usdBalanceOf()' must be implemented.");
  }
  async assetBalanceOf(address) {
    throw new Error("Method 'assetBalanceOf()' must be implemented.");
  }
  async pendingRewards(recipient, tokenPricesMappingTable, updateProgress) {
    throw new Error("Method 'pendingRewards()' must be implemented.");
  }
  async zapIn(
    recipient,
    investmentAmountInThisPosition,
    inputToken,
    inputTokenAddress,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
    existingInvestmentPositionsInThisChain,
  ) {
    if (this.mode === "single") {
      const [
        beforeZapInTxns,
        bestTokenAddressToZapIn,
        amountToZapIn,
        bestTokenToZapInDecimal,
      ] = await this._beforeDeposit(
        recipient,
        inputTokenAddress,
        investmentAmountInThisPosition,
        slippage,
        updateProgress,
      );
      const zapinTxns = await this.customDeposit(
        recipient,
        inputToken,
        bestTokenAddressToZapIn,
        amountToZapIn,
        bestTokenToZapInDecimal,
        tokenPricesMappingTable,
        slippage,
        updateProgress,
      );
      return beforeZapInTxns.concat(zapinTxns);
    } else if (this.mode === "LP") {
      // TODO: should meet all tokens listed in allowedZapInTokens
      throw new Error("Not implemented yet.");
      //   // TODO: it's just a pseudo code
      //   let txns = [];
      //   const [amountForToken0, amountForToken1] =
      //     this.calculateTokenAmountsForLPV2(
      //       inputToken,
      //       investmentAmountInThisPosition,
      //       tokenPricesMappingTable,
      //       decimalsOfToken0,
      //       decimalsOfToken1,
      //       minPrice,
      //       maxPrice,
      //     );
      //   const [swap0Txn, swap0EstimateAmount] = await this._swap(
      //     chosenToken,
      //     this.token0,
      //     ethers.utils.parseUnits(
      //       amountForToken0.toFixed(decimalsOfChosenToken),
      //       decimalsOfChosenToken,
      //     ),
      //     slippage,
      //   );
      //   const [swap1Txn, swap1EstimateAmount] = await this._swap(
      //     chosenToken,
      //     this.token1,
      //     ethers.utils.parseUnits(
      //       amountForToken1.toFixed(decimalsOfChosenToken),
      //       decimalsOfChosenToken,
      //     ),
      //     slippage,
      //   );
      //   txns.push(swap0Txn, swap1Txn);
      //   for (const [token, amount] of [
      //     [this.token0, swap0EstimateAmount],
      //     [this.token1, swap1EstimateAmount],
      //   ]) {
      //     const approveForCreateLpTxn = this._approve(
      //       token,
      //       liquidityManager,
      //       amount,
      //     );
      //     txns.push(approveForCreateLpTxn);
      //   }
      //   const mintOrIncreaseTxn = this._mintLPOrIncreaseLiquidity(
      //     swap0EstimateAmount,
      //     swap1EstimateAmount,
      //   );
      //   txns.push(mintOrIncreaseTxn);
      //   const finalTxns = this._customCallback(txns);
      //   return finalTxns;
    }
  }
  async zapOut(
    recipient,
    percentage,
    outputToken,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
    customParams,
    existingInvestmentPositionsInThisChain,
  ) {
    const [
      withdrawTxns,
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
      minOutAmount,
    ] = await this.customWithdrawAndClaim(
      recipient,
      percentage,
      slippage,
      tokenPricesMappingTable,
      updateProgress,
    );
    const withdrawTokenAndBalance =
      await this._calculateWithdrawTokenAndBalance(
        recipient,
        symbolOfBestTokenToZapOut,
        bestTokenAddressToZapOut,
        decimalOfBestTokenToZapOut,
        minOutAmount,
        tokenPricesMappingTable,
        updateProgress,
      );
    const batchSwapTxns = await this._batchSwap(
      recipient,
      withdrawTokenAndBalance,
      outputToken,
      slippage,
      updateProgress,
    );
    return [...withdrawTxns, ...batchSwapTxns];
  }
  async claimAndSwap(
    recipient,
    outputToken,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
    existingInvestmentPositionsInThisChain,
  ) {
    const [claimTxns, claimedTokenAndBalance] = await this.customClaim(
      recipient,
      tokenPricesMappingTable,
      updateProgress,
    );
    const txns = await this._batchSwap(
      recipient,
      claimedTokenAndBalance,
      outputToken,
      slippage,
      updateProgress,
    );
    return [...claimTxns, ...txns];
  }
  async customDeposit(
    recipient,
    inputToken,
    bestTokenAddressToZapIn,
    amountToZapIn,
    bestTokenToZapInDecimal,
    tokenPricesMappingTable,
    slippage,
    updateProgress,
  ) {
    throw new Error("Method 'customDeposit()' must be implemented.", amount);
  }
  async customWithdrawAndClaim(
    recipient,
    percentage,
    slippage,
    updateProgress,
  ) {
    throw new Error("Method 'customWithdrawAndClaim()' must be implemented.");
  }

  async customClaim(recipient, tokenPricesMappingTable, updateProgress) {
    throw new Error("Method 'customClaim()' must be implemented.");
  }

  _getTheBestTokenAddressToZapIn() {
    throw new Error(
      "Method '_getTheBestTokenAddressToZapIn()' must be implemented.",
    );
  }

  async _beforeDeposit(
    recipient,
    inputTokenAddress,
    investmentAmountInThisPosition,
    slippage,
    updateProgress,
  ) {
    let swapTxns = [];

    const tokenInstance = new ethers.Contract(
      inputTokenAddress,
      ERC20_ABI,
      PROVIDER,
    );
    const decimalsOfChosenToken = (await tokenInstance.functions.decimals())[0];
    const [bestTokenAddressToZapIn, bestTokenToZapInDecimal] =
      this._getTheBestTokenAddressToZapIn();
    let amountToZapIn = ethers.utils.parseUnits(
      investmentAmountInThisPosition.toFixed(decimalsOfChosenToken),
      decimalsOfChosenToken,
    );
    if (
      inputTokenAddress.toLowerCase() !== bestTokenAddressToZapIn.toLowerCase()
    ) {
      const [swapTxn, swapEstimateAmount] = await this._swap(
        recipient,
        inputTokenAddress,
        bestTokenAddressToZapIn,
        amountToZapIn,
        slippage,
        updateProgress,
      );
      amountToZapIn = Math.floor((swapEstimateAmount * (100 - slippage)) / 100);
      swapTxns.push(swapTxn);
    }
    const approveForZapInTxn = approve(
      bestTokenAddressToZapIn,
      this.protocolContract.address,
      amountToZapIn,
      updateProgress,
    );
    return [
      [...swapTxns, approveForZapInTxn],
      bestTokenAddressToZapIn,
      amountToZapIn,
      bestTokenToZapInDecimal,
    ];
  }
  async _batchSwap(
    recipient,
    withdrawTokenAndBalance,
    outputToken,
    slippage,
    updateProgress,
  ) {
    let txns = [];
    for (const [address, tokenMetadata] of Object.entries(
      withdrawTokenAndBalance,
    )) {
      const amount = tokenMetadata.balance;
      if (amount.toString() === "0" || amount === 0) {
        continue;
      }
      const approveTxn = approve(
        address,
        oneInchAddress,
        amount,
        updateProgress,
      );
      const swapTxnResult = await this._swap(
        recipient,
        address,
        outputToken,
        amount,
        slippage,
        updateProgress,
      );
      if (swapTxnResult === undefined) {
        continue;
      }
      txns = txns.concat([approveTxn, swapTxnResult[0]]);
    }
    return txns;
  }
  calculateTokensAddressAndBalances(
    withdrawTokenAndBalance,
    estimatedClaimTokensAddressAndBalance,
  ) {
    for (const [address, balance] of Object.entries(
      estimatedClaimTokensAddressAndBalance,
    )) {
      if (!withdrawTokenAndBalance[address]) {
        withdrawTokenAndBalance[address] = ethers.BigNumber.from(0);
      }

      // Ensure balance is a ethers.BigNumber
      const balanceBN = ethers.BigNumber.isBigNumber(balance)
        ? balance
        : ethers.BigNumber.from(balance);

      // Add balances
      withdrawTokenAndBalance[address] =
        withdrawTokenAndBalance[address].add(balanceBN);
    }
    return withdrawTokenAndBalance;
  }
  async _swap(
    walletAddress,
    fromTokenAddress,
    toTokenAddress,
    amount,
    slippage,
    updateProgress,
  ) {
    if (fromTokenAddress.toLowerCase() === toTokenAddress.toLowerCase()) {
      return;
    }
    updateProgress(`swap ${fromTokenAddress} to ${toTokenAddress}`);
    const swapCallData = await fetch1InchSwapData(
      this.chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      slippage,
    );
    if (swapCallData["data"] === undefined) {
      throw new Error("Swap data is undefined. Cannot proceed with swapping.");
    }
    if (swapCallData["toAmount"] === 0) {
      throw new Error("To amount is 0. Cannot proceed with swapping.");
    }
    return [
      prepareTransaction({
        to: oneInchAddress,
        chain: arbitrum,
        client: THIRDWEB_CLIENT,
        data: swapCallData["data"],
      }),
      swapCallData["toAmount"],
    ];
  }
  async _calculateWithdrawTokenAndBalance(
    recipient,
    symbolOfBestTokenToZapOut,
    bestTokenAddressToZapOut,
    decimalOfBestTokenToZapOut,
    minOutAmount,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    let withdrawTokenAndBalance = {};
    withdrawTokenAndBalance[bestTokenAddressToZapOut] = {
      symbol: symbolOfBestTokenToZapOut,
      balance: minOutAmount,
      usdDenominatedValue:
        (tokenPricesMappingTable[symbolOfBestTokenToZapOut] * minOutAmount) /
        Math.pow(10, decimalOfBestTokenToZapOut),
      decimals: decimalOfBestTokenToZapOut,
    };
    const pendingRewards = await this.pendingRewards(
      recipient,
      tokenPricesMappingTable,
      updateProgress,
    );
    for (const [address, metadata] of Object.entries(pendingRewards)) {
      if (withdrawTokenAndBalance[address]) {
        withdrawTokenAndBalance[address].balance = withdrawTokenAndBalance[
          address
        ].balance.add(metadata.balance);
        withdrawTokenAndBalance[address].usdDenominatedValue =
          (tokenPricesMappingTable[withdrawTokenAndBalance[metadata.symbol]] *
            withdrawTokenAndBalance[address].balance) /
          Math.pow(10, withdrawTokenAndBalance[address].decimals);
      } else {
        withdrawTokenAndBalance[address] = metadata;
      }
    }
    return withdrawTokenAndBalance;
  }
}
