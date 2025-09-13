import { ethers } from "ethers";
import { CHAIN_ID_TO_CHAIN, PROVIDER, NULL_ADDRESS } from "../utils/general.js";
import ERC20_ABI from "../lib/contracts/ERC20.json" assert { type: "json" };
import BaseUniswap from "./uniswapv3/BaseUniswap.js";
import assert from "assert";
import THIRDWEB_CLIENT from "../utils/thirdweb";
import { prepareContractCall, getContract } from "thirdweb";
import swap from "../utils/swapHelper";
import { FlowChartMixin } from "./mixins/FlowChartMixin.js";
import flowChartEventEmitter from "../utils/FlowChartEventEmitter";
import {
  addPendingRewardsToBalance,
  createTokenBalanceEntry,
} from "../utils/portfolioCalculation";
import logger from "../utils/logger";

export default class BaseProtocol extends BaseUniswap {
  constructor(chain, chaindId, symbolList, mode, customParams) {
    super();
    this.protocolType = this.constructor.name;
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

    this._validateConstructorParams();
  }

  _validateConstructorParams() {
    assert(this.chain !== undefined, "chain is not set");
    assert(this.chainId !== undefined, "chainId is not set");
    assert(this.symbolList !== undefined, "symbolList is not set");
    assert(this.mode !== undefined, "mode is not set");
    assert(this.customParams !== undefined, "customParams is not set");
  }

  uniqueId() {
    return `${this.chain}/${this.protocolName}/${
      this.protocolVersion
    }/${this.symbolList.join("-")}/${this.protocolType}`;
  }
  oldUniqueId() {
    return `${this.chain}/${this.protocolName}/${
      this.protocolVersion
    }/${this.symbolList.join("-")}`;
  }
  toString() {
    const maxSymbols = 2;
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
      "protocolContract is not set",
    );
    assert(
      typeof this.stakeFarmContract === "object",
      "stakeFarmContract is not set",
    );
  }

  async usdBalanceOf(address, tokenPricesMappingTable) {
    throw new Error("Method 'usdBalanceOf()' must be implemented.");
  }
  async assetUsdBalanceOf(owner, tokenPricesMappingTable) {
    const balance = await this.assetBalanceOf(owner);
    const assetPrice = await this.assetUsdPrice(tokenPricesMappingTable);

    // Calculate: (balance * price) / (10 ** assetDecimals)
    return balance * assetPrice;
  }
  async stakeBalanceOf(address) {
    throw new Error("Method 'stakeBalanceOf()' must be implemented.");
  }
  async assetBalanceOf(recipient) {
    const assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    const balance = (
      await assetContractInstance.functions.balanceOf(recipient)
    )[0];
    return balance;
  }
  async pendingRewards(recipient, tokenPricesMappingTable, updateProgress) {
    throw new Error("Method 'pendingRewards()' must be implemented.");
  }
  async assetUsdPrice(tokenPricesMappingTable) {
    throw new Error("Method 'assetUsdPrice()' must be implemented.");
  }
  async zapIn(
    recipient,
    chain,
    investmentAmountInThisPosition,
    inputToken,
    tokenInAddress,
    tokenDecimals,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    try {
      // Wait for event emitter to be ready
      while (!flowChartEventEmitter.isReady()) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      let finalTxns = [];
      await this._handleTransactionProgress(
        updateProgress,
        `${this.uniqueId()}-approve`,
        0,
        "initial approve",
      );

      const [beforeZapInTxns, depositParams] = await this._prepareDeposit(
        recipient,
        tokenInAddress,
        investmentAmountInThisPosition,
        slippage,
        updateProgress,
        inputToken,
        tokenDecimals,
        tokenPricesMappingTable,
      );
      const [zapinTxns, tradingLoss] = await this._executeDeposit(
        recipient,
        depositParams,
        tokenPricesMappingTable,
        slippage,
        updateProgress,
      );
      finalTxns = beforeZapInTxns.concat(zapinTxns);
      await this._handleTransactionProgress(
        updateProgress,
        `${this.uniqueId()}-deposit`,
        tradingLoss,
        "deposit",
      );
      console.log("finalTxns", finalTxns);
      this.checkTxnsToDataNotUndefined(finalTxns, "zapIn");
      await this._handleTransactionProgress(
        updateProgress,
        `${this.uniqueId()}-stake`,
        0,
        "stake",
      );
      return finalTxns;
    } catch (error) {
      logger.error("Error in zapIn:", error);
      throw error;
    }
  }

  async _prepareDeposit(
    recipient,
    tokenInAddress,
    investmentAmountInThisPosition,
    slippage,
    updateProgress,
    inputToken,
    tokenDecimals,
    tokenPricesMappingTable,
  ) {
    if (this.mode === "single") {
      const [
        beforeZapInTxns,
        bestTokenSymbol,
        bestTokenAddressToZapIn,
        amountToZapIn,
        bestTokenToZapInDecimal,
      ] = await this._beforeDeposit(
        recipient,
        tokenInAddress,
        investmentAmountInThisPosition,
        slippage,
        updateProgress,
        inputToken,
        tokenDecimals,
        tokenPricesMappingTable,
      );
      return [
        beforeZapInTxns,
        {
          bestTokenSymbol,
          bestTokenAddressToZapIn,
          amountToZapIn,
          bestTokenToZapInDecimal,
        },
      ];
    } else if (this.mode === "LP") {
      const [
        beforeZapInTxns,
        bestTokenSymbol,
        bestTokenAddressToZapIn,
        amountToZapIn,
        bestTokenToZapInDecimal,
      ] = await this._beforeDepositLP(
        recipient,
        tokenInAddress,
        investmentAmountInThisPosition,
        slippage,
        updateProgress,
        inputToken,
        tokenDecimals,
        tokenPricesMappingTable,
      );
      return [
        beforeZapInTxns,
        {
          bestTokenSymbol,
          bestTokenAddressToZapIn,
          amountToZapIn,
          bestTokenToZapInDecimal,
        },
      ];
    }
    throw new Error(`Invalid mode: ${this.mode}`);
  }

  async _executeDeposit(
    recipient,
    depositParams,
    tokenPricesMappingTable,
    slippage,
    updateProgress,
  ) {
    const {
      bestTokenSymbol,
      bestTokenAddressToZapIn,
      amountToZapIn,
      bestTokenToZapInDecimal,
    } = depositParams;

    if (this.mode === "single") {
      return await this.customDeposit(
        recipient,
        bestTokenSymbol,
        bestTokenAddressToZapIn,
        amountToZapIn,
        bestTokenToZapInDecimal,
        tokenPricesMappingTable,
        slippage,
        updateProgress,
      );
    } else if (this.mode === "LP") {
      return await this.customDepositLP(
        recipient,
        bestTokenSymbol,
        bestTokenAddressToZapIn,
        amountToZapIn,
        bestTokenToZapInDecimal,
        tokenPricesMappingTable,
        slippage,
        updateProgress,
      );
    }
    throw new Error(`Invalid mode: ${this.mode}`);
  }

  async zapOut(
    recipient,
    percentage,
    outputToken,
    outputTokenSymbol,
    outputTokenDecimals,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
    customParams,
    existingInvestmentPositionsInThisChain,
  ) {
    try {
      let withdrawTxns = [];
      let redeemTxns = [];
      let withdrawTokenAndBalance = {};
      if (this.mode === "single") {
        const [
          withdrawTxnsForSingle,
          symbolOfBestTokenToZapOut,
          bestTokenAddressToZapOut,
          decimalOfBestTokenToZapOut,
          minOutAmount,
        ] = await this.baseWithdrawAndClaim(
          recipient,
          percentage,
          slippage,
          tokenPricesMappingTable,
          updateProgress,
        );
        const [redeemTxnsForSingle, withdrawTokenAndBalanceForSingle] =
          await this._calculateWithdrawTokenAndBalance(
            recipient,
            symbolOfBestTokenToZapOut,
            bestTokenAddressToZapOut,
            decimalOfBestTokenToZapOut,
            minOutAmount,
            tokenPricesMappingTable,
            updateProgress,
          );
        withdrawTxns = withdrawTxnsForSingle;
        redeemTxns = redeemTxnsForSingle;
        withdrawTokenAndBalance = withdrawTokenAndBalanceForSingle;
      } else if (this.mode === "LP") {
        const [withdrawLPTxns, tokenMetadatas, minPairAmounts] =
          await this.baseWithdrawLPAndClaim(
            recipient,
            percentage,
            slippage,
            tokenPricesMappingTable,
            updateProgress,
          );
        if (
          withdrawLPTxns === undefined &&
          tokenMetadatas === undefined &&
          minPairAmounts === undefined
        ) {
          // it means the NFT has been burned, so we don't need to do anything
          return [];
        }
        const [redeemTxnsFromLP, withdrawTokenAndBalanceFromLP] =
          await this._calculateWithdrawLPTokenAndBalance(
            recipient,
            tokenMetadatas,
            minPairAmounts,
            tokenPricesMappingTable,
            updateProgress,
          );
        withdrawTxns = withdrawLPTxns;
        redeemTxns = redeemTxnsFromLP;
        withdrawTokenAndBalance = withdrawTokenAndBalanceFromLP;
      }
      const batchSwapTxns = await this._batchSwap(
        recipient,
        withdrawTokenAndBalance,
        outputToken,
        outputTokenSymbol,
        outputTokenDecimals,
        slippage,
        tokenPricesMappingTable,
        updateProgress,
      );
      const txns = [...withdrawTxns, ...redeemTxns, ...batchSwapTxns];
      this.checkTxnsToDataNotUndefined(txns, "zapOut");
      return txns;
    } catch (error) {
      logger.error("Error in zapOut:", error);
      throw error;
    }
  }
  async claimAndSwap(
    recipient,
    outputToken,
    outputTokenSymbol,
    outputTokenDecimals,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    try {
      await this._updateProgressAndWait(
        updateProgress,
        `${this.uniqueId()}-claim`,
        0,
      );
      const [claimTxns, claimedTokenAndBalance] = await this.customClaim(
        recipient,
        tokenPricesMappingTable,
        updateProgress,
      );
      const txns = await this._batchSwap(
        recipient,
        claimedTokenAndBalance,
        outputToken,
        outputTokenSymbol,
        outputTokenDecimals,
        slippage,
        tokenPricesMappingTable,
        updateProgress,
      );
      const redeemTxns = await this.customRedeemVestingRewards({}, recipient);
      const finalTxns = [...claimTxns, ...txns, ...redeemTxns];
      // uncomment this line for camelot redeem
      // const finalTxns = [...claimTxns, ...redeemTxns];
      this.checkTxnsToDataNotUndefined(finalTxns, "claimAndSwap");
      return finalTxns;
    } catch (error) {
      logger.error("Error in claimAndSwap:", error);
      throw error;
    }
  }

  async transfer(owner, percentage, updateProgress, recipient) {
    let amount;
    let unstakeTxnsOfThisProtocol;
    if (this.mode === "single") {
      [unstakeTxnsOfThisProtocol, amount] = await this._unstake(
        owner,
        percentage,
        updateProgress,
      );
    } else if (this.mode === "LP") {
      [unstakeTxnsOfThisProtocol, amount] = await this._unstakeLP(
        owner,
        percentage,
        updateProgress,
      );
    } else {
      throw new Error("Invalid mode for transfer");
    }

    // Ensure amount is valid
    if (!amount || amount.toString() === "0") {
      throw new Error("No amount available to transfer");
    }

    const transferTxn = prepareContractCall({
      contract: this.assetContract,
      method: "transfer",
      params: [recipient, amount],
    });
    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-transfer`,
      0,
    );
    const finalTxns = [...unstakeTxnsOfThisProtocol, transferTxn];
    this.checkTxnsToDataNotUndefined(finalTxns, "transfer");
    return finalTxns;
  }
  async stake(protocolAssetDustInWallet, updateProgress) {
    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-stake`,
      0,
    );
    let stakeTxns = [];
    const amount =
      protocolAssetDustInWallet[this.assetContract.address].assetBalance;
    if (amount.toString() === "0") {
      return [];
    }
    if (this.mode === "single") {
      stakeTxns = await this._stake(amount, updateProgress);
    } else if (this.mode === "LP") {
      stakeTxns = await this._stakeLP(amount, updateProgress);
    } else {
      throw new Error("Invalid mode for stake");
    }
    this.checkTxnsToDataNotUndefined(stakeTxns, "stake");
    return stakeTxns;
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
  async baseWithdrawAndClaim(
    owner,
    percentage,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    await this._handleTransactionProgress(
      updateProgress,
      `${this.uniqueId()}-unstake`,
      0,
      "unstake",
    );
    const [unstakeTxns, unstakedAmount] = await this._unstake(
      owner,
      percentage,
      updateProgress,
    );
    await this._handleTransactionProgress(
      updateProgress,
      `${this.uniqueId()}-claim`,
      0,
      "claim",
    );
    const [
      withdrawAndClaimTxns,
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
      minTokenOut,
      tradingLoss,
    ] = await this.customWithdrawAndClaim(
      owner,
      unstakedAmount,
      slippage,
      tokenPricesMappingTable,
      updateProgress,
    );
    assert(
      typeof tradingLoss === "number",
      `${this.uniqueId()} tradingLoss is undefined or not a number ${tradingLoss}, typeof tradingLoss: ${typeof tradingLoss}`,
    );
    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-withdraw`,
      tradingLoss,
    );
    return [
      [...unstakeTxns, ...withdrawAndClaimTxns],
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
      ethers.BigNumber.isBigNumber(minTokenOut)
        ? minTokenOut
        : ethers.BigNumber.from(BigInt(minTokenOut)),
    ];
  }
  async baseWithdrawLPAndClaim(
    owner,
    percentage,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    await this._handleTransactionProgress(
      updateProgress,
      `${this.uniqueId()}-unstake`,
      0,
      "unstake",
    );
    const [unstakeTxns, unstakedAmount] = await this._unstakeLP(
      owner,
      percentage,
      updateProgress,
    );
    if (unstakedAmount === undefined) {
      // it means the NFT has been burned
      return [undefined, undefined, undefined];
    }
    await this._handleTransactionProgress(
      updateProgress,
      `${this.uniqueId()}-claim`,
      0,
      "claim",
    );
    const [withdrawAndClaimTxns, tokenMetadatas, minPairAmounts, tradingLoss] =
      await this.customWithdrawLPAndClaim(
        owner,
        unstakedAmount,
        slippage,
        tokenPricesMappingTable,
        updateProgress,
      );
    assert(
      typeof tradingLoss === "number",
      `${this.uniqueId()} tradingLoss is undefined or not a number ${tradingLoss}, typeof tradingLoss: ${typeof tradingLoss}`,
    );
    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-withdraw`,
      tradingLoss,
    );
    for (const minPairAmount of minPairAmounts) {
      if (!ethers.BigNumber.isBigNumber(minPairAmount)) {
        minPairAmounts[minPairAmounts.indexOf(minPairAmount)] =
          ethers.BigNumber.from(BigInt(minPairAmount));
      }
    }
    return [
      [...unstakeTxns, ...withdrawAndClaimTxns],
      tokenMetadatas,
      minPairAmounts,
    ];
  }

  async customClaim(owner, tokenPricesMappingTable, updateProgress) {
    throw new Error("Method 'customClaim()' must be implemented.");
  }

  async customRedeemVestingRewards(pendingRewards, owner) {
    return [];
  }

  _getTheBestTokenAddressToZapIn(inputToken, tokenAddress, InputTokenDecimals) {
    throw new Error(
      "Method '_getTheBestTokenAddressToZapIn()' must be implemented.",
    );
  }
  _getLPTokenPairesToZapIn() {
    return {
      lpTokens: this.customParams.lpTokens,
      tickers: this.customParams.tickers,
    };
  }
  _getTheBestTokenAddressToZapOut() {
    throw new Error(
      "Method '_getTheBestTokenAddressToZapOut()' must be implemented.",
    );
  }
  _getLPTokenAddressesToZapOut() {
    return this._getLPTokenPairesToZapIn();
  }
  async _beforeDeposit(
    recipient,
    tokenInAddress,
    investmentAmountInThisPosition,
    slippage,
    updateProgress,
    inputToken,
    tokenDecimals,
    tokenPricesMappingTable,
  ) {
    let totalSwapTxns = [];
    const [bestTokenSymbol, bestTokenAddressToZapIn, bestTokenToZapInDecimal] =
      this._getTheBestTokenAddressToZapIn(
        inputToken,
        tokenInAddress,
        tokenDecimals,
      );
    let amountToZapIn = investmentAmountInThisPosition;
    if (
      tokenInAddress.toLowerCase() !== bestTokenAddressToZapIn.toLowerCase()
    ) {
      const handleStatusUpdate = null;
      const [swapTxns, swapEstimateAmount, _] = await swap(
        recipient,
        this.chainId,
        this.uniqueId(),
        this._updateProgressAndWait,
        tokenInAddress,
        bestTokenAddressToZapIn,
        amountToZapIn,
        slippage,
        updateProgress,
        inputToken,
        tokenDecimals,
        bestTokenSymbol,
        bestTokenToZapInDecimal,
        tokenPricesMappingTable,
        handleStatusUpdate,
      );
      amountToZapIn = String(
        Math.floor((swapEstimateAmount * (100 - slippage)) / 100),
      );
      totalSwapTxns = totalSwapTxns.concat(swapTxns);
    }
    return [
      totalSwapTxns,
      bestTokenSymbol,
      bestTokenAddressToZapIn,
      amountToZapIn,
      bestTokenToZapInDecimal,
    ];
  }
  async _beforeDepositLP(
    recipient,
    tokenInAddress,
    investmentAmountInThisPosition,
    slippage,
    updateProgress,
    inputToken,
    tokenDecimals,
    tokenPricesMappingTable,
  ) {
    // Validate and get token pairs
    const { lpTokens: tokenMetadatas, tickers } =
      this._getLPTokenPairesToZapIn();
    if (tokenMetadatas.length !== 2) {
      throw new Error(
        `Currently only support 2 tokens in LP, but got ${tokenMetadatas.length}`,
      );
    }

    // Calculate initial ratios
    const usdAmount =
      investmentAmountInThisPosition * tokenPricesMappingTable[inputToken];
    const lpTokenRatio = await this._calculateTokenAmountsForLP(
      usdAmount,
      tokenMetadatas,
      tickers,
      tokenPricesMappingTable,
    );
    const sumOfLPTokenRatio = lpTokenRatio.reduce(
      (acc, value) => acc.add(value),
      ethers.BigNumber.from(0),
    );
    // Process swaps for each token
    const [swapTxns, amountsAfterSwap] = await this._processTokenSwaps(
      recipient,
      tokenInAddress,
      inputToken,
      tokenDecimals,
      tokenMetadatas,
      lpTokenRatio,
      sumOfLPTokenRatio,
      investmentAmountInThisPosition,
      slippage,
      updateProgress,
      tokenPricesMappingTable,
    );
    // Balance token ratios
    const balancedAmounts = this._balanceTokenRatios(
      amountsAfterSwap,
      tokenMetadatas,
      lpTokenRatio,
      tokenPricesMappingTable,
    );
    // Format final metadata
    const swappedTokenMetadatas = tokenMetadatas.map((metadata, index) => [
      ...metadata.slice(0, 3),
      balancedAmounts[index],
    ]);
    return [swapTxns, swappedTokenMetadatas[0], swappedTokenMetadatas[1]];
  }

  async _processTokenSwaps(
    recipient,
    tokenInAddress,
    inputToken,
    tokenDecimals,
    tokenMetadatas,
    lpTokenRatio,
    sumOfLPTokenRatio,
    investmentAmount,
    slippage,
    updateProgress,
    tokenPricesMappingTable,
  ) {
    let totalSwapTxns = [];
    const amountsAfterSwap = [];

    for (const [
      index,
      [bestTokenSymbol, bestTokenAddress, bestTokenToZapInDecimal],
    ] of tokenMetadatas.entries()) {
      let amountToZapIn = investmentAmount
        .mul(lpTokenRatio[index])
        .div(sumOfLPTokenRatio);

      if (tokenInAddress.toLowerCase() !== bestTokenAddress.toLowerCase()) {
        const handleStatusUpdate = null;
        const [swapTxns, swapEstimateAmount, _] = await swap(
          recipient,
          this.chainId,
          this.uniqueId(),
          this._updateProgressAndWait,
          tokenInAddress,
          bestTokenAddress,
          amountToZapIn,
          slippage,
          updateProgress,
          inputToken,
          tokenDecimals,
          bestTokenSymbol,
          bestTokenToZapInDecimal,
          tokenPricesMappingTable,
          handleStatusUpdate,
        );

        amountToZapIn = ethers.BigNumber.from(
          BigInt(Math.floor(swapEstimateAmount)),
        );
        totalSwapTxns = totalSwapTxns.concat(swapTxns);
      }

      amountsAfterSwap.push(amountToZapIn);
    }

    return [totalSwapTxns, amountsAfterSwap];
  }

  _balanceTokenRatios(
    amounts,
    tokenMetadatas,
    lpTokenRatio,
    tokenPricesMappingTable,
  ) {
    const PRECISION = 10000000000000;
    const MAX_UINT256 = ethers.BigNumber.from("2").pow(256).sub(1);

    // Calculate USD values and ratios
    const usdValues = this._calculateUsdValues(
      amounts,
      tokenMetadatas,
      tokenPricesMappingTable,
    );
    const { currentRatio, targetRatio } = this._calculateRatios(
      usdValues,
      lpTokenRatio,
    );

    // Convert ratios to BigNumber format
    const ratios = this._convertRatiosToBigNumber(
      currentRatio,
      targetRatio,
      PRECISION,
    );

    // Balance the amounts based on ratios
    return this._adjustAmountsToMatchRatio(amounts, ratios, MAX_UINT256);
  }

  _calculateUsdValues(amounts, tokenMetadatas, tokenPricesMappingTable) {
    return amounts.map((amount, index) => {
      const tokenDecimals = tokenMetadatas[index][2];
      const tokenSymbol = tokenMetadatas[index][0];
      const normalizedAmount = Number(
        ethers.utils.formatUnits(amount, tokenDecimals),
      );
      if (tokenPricesMappingTable[tokenSymbol] === undefined) {
        throw new Error(`No price found for token ${tokenSymbol}`);
      }
      return normalizedAmount * tokenPricesMappingTable[tokenSymbol];
    });
  }

  _calculateRatios(usdValues, lpTokenRatio) {
    return {
      currentRatio: usdValues[0] / usdValues[1],
      targetRatio: lpTokenRatio[0] / lpTokenRatio[1],
    };
  }

  _convertRatiosToBigNumber(currentRatio, targetRatio, precision) {
    return {
      current: ethers.BigNumber.from(
        BigInt(Math.floor(currentRatio * precision)),
      ),
      target: ethers.BigNumber.from(
        BigInt(Math.floor(targetRatio * precision)),
      ),
    };
  }

  _adjustAmountsToMatchRatio(amounts, ratios, maxUint256) {
    const balancedAmounts = [...amounts];
    const isCurrentRatioHigher = ratios.current.gt(ratios.target);
    const indexToAdjust = isCurrentRatioHigher ? 0 : 1;

    const newAmount = isCurrentRatioHigher
      ? amounts[0].mul(ratios.target).div(ratios.current)
      : amounts[1].mul(ratios.current).div(ratios.target);

    if (this._isAmountInValidRange(newAmount, maxUint256)) {
      balancedAmounts[indexToAdjust] = newAmount;
    } else {
      logger.error(
        `Amount[${indexToAdjust}] outside safe uint256 range - setting to 0`,
      );
      balancedAmounts[indexToAdjust] = ethers.BigNumber.from("0");
    }

    return balancedAmounts;
  }

  _isAmountInValidRange(amount, maxUint256) {
    return !amount.lt(0) && !amount.gt(maxUint256);
  }

  async _batchSwap(
    recipient,
    withdrawTokenAndBalance,
    outputToken,
    outputTokenSymbol,
    outputTokenDecimals,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    let txns = [];

    // Validate input parameters
    if (
      !withdrawTokenAndBalance ||
      typeof withdrawTokenAndBalance !== "object"
    ) {
      logger.warn(
        `${this.uniqueId()}: Invalid withdrawTokenAndBalance format:`,
        withdrawTokenAndBalance,
      );
      return txns;
    }

    for (const [address, tokenMetadata] of Object.entries(
      withdrawTokenAndBalance,
    )) {
      // Validate token metadata
      if (!tokenMetadata || typeof tokenMetadata !== "object") {
        logger.warn(
          `${this.uniqueId()}: Invalid tokenMetadata for address ${address}:`,
          tokenMetadata,
        );
        continue;
      }

      const amount = tokenMetadata.balance;
      const fromTokenSymbol = tokenMetadata.symbol;
      const fromTokenDecimals = tokenMetadata.decimals;

      // Validate required fields
      if (!amount || !fromTokenSymbol || !fromTokenDecimals) {
        logger.warn(
          `${this.uniqueId()}: Missing required fields for token at address ${address}:`,
          {
            amount,
            fromTokenSymbol,
            fromTokenDecimals,
          },
        );
        continue;
      }

      // Safely convert amount to string for comparison
      const amountStr = amount.toString();
      if (
        amountStr === "0" ||
        amount === 0 ||
        tokenMetadata.vesting === true ||
        // if usd value of this token is less than 1, then it's easy to suffer from high slippage
        tokenMetadata.usdDenominatedValue < 1
      ) {
        logger.warn(
          `Skip selling ${fromTokenSymbol} because its usdDenominatedValue is less than 1`,
          tokenMetadata.usdDenominatedValue,
          "amount:",
          amount,
        );
        continue;
      }

      try {
        const handleStatusUpdate = null;
        const swapTxnResult = await swap(
          recipient,
          this.chainId,
          this.uniqueId(),
          this._updateProgressAndWait,
          address,
          outputToken,
          amount,
          slippage,
          updateProgress,
          fromTokenSymbol,
          fromTokenDecimals,
          outputTokenSymbol,
          outputTokenDecimals,
          tokenPricesMappingTable,
          handleStatusUpdate,
        );
        if (swapTxnResult === undefined) {
          continue;
        }
        txns = txns.concat(swapTxnResult[0]);
      } catch (error) {
        logger.error(
          `${this.uniqueId()}: Error processing swap for token ${fromTokenSymbol}:`,
          error,
        );
        continue;
      }
    }
    return txns;
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

    // Create initial token balance entry
    withdrawTokenAndBalance[bestTokenAddressToZapOut] = createTokenBalanceEntry(
      {
        address: bestTokenAddressToZapOut,
        symbol: symbolOfBestTokenToZapOut,
        balance: minOutAmount,
        decimals: decimalOfBestTokenToZapOut,
        tokenPricesMappingTable,
      },
    );

    // Get and add pending rewards
    const pendingRewards = await this.pendingRewards(
      recipient,
      tokenPricesMappingTable,
      updateProgress,
    );
    const redeemTxns = await this.customRedeemVestingRewards(
      pendingRewards,
      recipient,
    );

    // Add pending rewards to balance
    withdrawTokenAndBalance = addPendingRewardsToBalance(
      withdrawTokenAndBalance,
      pendingRewards,
      tokenPricesMappingTable,
    );

    return [redeemTxns, withdrawTokenAndBalance];
  }

  async _calculateWithdrawLPTokenAndBalance(
    recipient,
    tokenMetadatas,
    minPairAmounts,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    let withdrawTokenAndBalance = {};

    // Create initial token balance entries for LP tokens
    for (const [index, tokenMetadata] of tokenMetadatas.entries()) {
      const [
        symbolOfBestTokenToZapOut,
        bestTokenAddressToZapOut,
        decimalOfBestTokenToZapOut,
      ] = tokenMetadata;
      const minOutAmount = minPairAmounts[index];

      if (minOutAmount.toString() === "0" || minOutAmount === 0) {
        continue;
      }

      withdrawTokenAndBalance[bestTokenAddressToZapOut] =
        createTokenBalanceEntry({
          address: bestTokenAddressToZapOut,
          symbol: symbolOfBestTokenToZapOut,
          balance: minOutAmount,
          decimals: decimalOfBestTokenToZapOut,
          tokenPricesMappingTable,
        });
    }

    // Get and add pending rewards
    const pendingRewards = await this.pendingRewards(
      recipient,
      tokenPricesMappingTable,
      updateProgress,
    );
    // const redeemTxns = await this.customRedeemVestingRewards(
    //   pendingRewards,
    //   recipient,
    // );

    // Add pending rewards to balance
    withdrawTokenAndBalance = addPendingRewardsToBalance(
      withdrawTokenAndBalance,
      pendingRewards,
      tokenPricesMappingTable,
    );

    return [[], withdrawTokenAndBalance];
    // return [redeemTxns, withdrawTokenAndBalance];
  }

  async _stake(amount, updateProgress) {
    throw new Error("Method '_stake()' must be implemented.");
  }
  async _stakeLP(amount, updateProgress) {
    throw new Error("Method '_stakeLP()' must be implemented.");
  }
  async _unstake(owner, percentage, updateProgress) {
    throw new Error("Method '_unstake()' must be implemented.");
  }
  async _unstakeLP(owner, percentage, updateProgress) {
    throw new Error("Method '_unstakeLP()' must be implemented.");
  }
  async customWithdrawAndClaim(
    owner,
    withdrawAmount,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    throw new Error("Method 'customWithdrawAndClaim()' must be implemented.");
  }
  async customWithdrawLPAndClaim(
    owner,
    amount,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    throw new Error("Method 'customWithdrawLPAndClaim()' must be implemented.");
  }
  async _calculateTokenAmountsForLP(
    usdAmount,
    tokenMetadatas,
    tickers,
    tokenPricesMappingTable,
  ) {
    throw new Error(
      'Method "_calculateTokenAmountsForLP()" must be implemented.',
    );
  }
  mul_with_slippage_in_bignumber_format(amount, slippage) {
    // Convert amount to BigNumber if it isn't already
    const amountBN = ethers.BigNumber.isBigNumber(amount)
      ? amount
      : ethers.BigNumber.from(BigInt(Math.floor(amount)));

    // Convert slippage to basis points (e.g., 0.5% -> 50)
    const slippageBasisPoints = ethers.BigNumber.from(
      BigInt(Math.floor(slippage * 100)),
    );

    // Calculate (amount * (10000 - slippageBasisPoints)) / 10000
    return amountBN
      .mul(ethers.BigNumber.from(10000).sub(slippageBasisPoints))
      .div(10000);
  }
  async lockUpPeriod(address) {
    throw new Error("Method 'lockUpPeriod()' must be implemented.");
  }
  async approve(tokenAddress, spenderAddress, amount, updateProgress, chainId) {
    if (typeof amount !== "object") {
      amount = ethers.BigNumber.from(BigInt(Math.floor(amount)));
    }
    const approvalAmount = amount;
    if (approvalAmount === 0) {
      throw new Error("Approval amount is 0. Cannot proceed with approving.");
    }
    if (spenderAddress === NULL_ADDRESS) {
      throw new Error(
        "Spender address is null. Cannot proceed with approving.",
      );
    }
    const contractCall = prepareContractCall({
      contract: getContract({
        client: THIRDWEB_CLIENT,
        address: tokenAddress,
        chain: CHAIN_ID_TO_CHAIN[chainId],
        abi: ERC20_ABI,
      }),
      method: "approve", // <- this gets inferred from the contract
      params: [spenderAddress, approvalAmount],
    });
    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-approve`,
      0,
    );
    return contractCall;
  }

  getDeadline() {
    return Math.floor(Date.now() / 1000) + 600; // 10 minute deadline
  }
  checkTxnsToDataNotUndefined(txns, methodName) {
    for (const txn of txns) {
      if (txn.data === undefined || txn.to === undefined) {
        logger.error(txn);
        throw new Error(
          `${methodName} of ${this.uniqueId()} has undefined data or undefined to. Cannot proceed with executing.`,
        );
      }
    }
  }

  async rebalance(account, actionParams) {
    try {
      const { updateProgress } = actionParams;
      await this._updateProgressAndWait(updateProgress, "rebalance", 0);

      // ... rest of rebalance code ...
    } catch (error) {
      logger.error("Error in rebalance:", error);
      throw error;
    }
  }
}

// Apply mixins
Object.assign(BaseProtocol.prototype, FlowChartMixin);
