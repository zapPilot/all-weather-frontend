import { ethers } from "ethers";
import { ERC20_ABI } from "../../node_modules/@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import { encodeFunctionData } from "viem";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json" assert { type: "json" };
import CamelotNFTPositionManager from "../../lib/contracts/CamelotNFTPositionManager.json" assert { type: "json" };
import { fetch1InchSwapData } from "../../utils/oneInch.js";
import { CHAIN_ID_TO_CHAIN } from "../../utils/general.js";
import assert from "assert";
import BaseUniswap from "../uniswapv3/BaseUniswap.js";
import {
  approvalBufferParam,
  slippageForLP,
  nullAddress,
} from "../slippageUtils.js";
const oneInchAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
const PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_RPC_PROVIDER_URL,
);
export class CamelotV3 extends BaseUniswap {
  static projectID = "camelot";
  static projectVersion = "v3";
  static protocolName = `${CamelotV3.projectID}-${CamelotV3.projectVersion}`;
  static lpTokenAddress = "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15";
  constructor(
    chaindId,
    symbolList,
    token2TokenIdMapping,
    token0,
    token1,
    tickLower,
    tickUpper,
    aaWalletAddress,
  ) {
    super();
    this.chainId = chaindId;
    this.symbolList = symbolList;
    this.token2TokenIdMapping = token2TokenIdMapping;
    this.token0 = token0;
    this.token1 = token1;
    this.tickLower = tickLower;
    this.tickUpper = tickUpper;
    this.aaWalletAddress = aaWalletAddress;
  }
  async invest(
    investmentAmountInThisPosition,
    inputToken,
    tokenAddress,
    slippage,
    existingInvestmentPositionsInThisChain,
    tokenPricesMappingTable,
  ) {
    // get erc20 Contract Interface
    const erc20Instance = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    const token0Instance = new ethers.Contract(
      this.token0,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    const token1Instance = new ethers.Contract(
      this.token1,
      ERC20_ABI,
      PROVIDER(this.chain),
    );

    const decimalsOfToken0 = (await token0Instance.functions.decimals())[0];
    const decimalsOfToken1 = (await token1Instance.functions.decimals())[0];
    const decimalsOfChosenToken = (await erc20Instance.functions.decimals())[0];
    const depositAmountUSD =
      tokenPricesMappingTable[inputToken] * investmentAmountInThisPosition;

    const minPrice =
      1.0001 ** this.tickLower *
      10 ** (18 * 2 - decimalsOfToken0 - decimalsOfToken1);
    const maxPrice =
      1.0001 ** this.tickUpper *
      10 ** (18 * 2 - decimalsOfToken0 - decimalsOfToken1);
    const currentPrice =
      tokenPricesMappingTable[this.symbolList[0]] /
        tokenPricesMappingTable[this.symbolList[1]] >
        minPrice &&
      tokenPricesMappingTable[this.symbolList[0]] /
        tokenPricesMappingTable[this.symbolList[1]] <
        maxPrice
        ? tokenPricesMappingTable[this.symbolList[0]] /
          tokenPricesMappingTable[this.symbolList[1]]
        : tokenPricesMappingTable[this.symbolList[1]] /
          tokenPricesMappingTable[this.symbolList[0]];
    const [amountForToken0, amountForToken1] = this.calculateTokenAmountsForLP(
      depositAmountUSD,
      tokenPricesMappingTable[this.symbolList[0]],
      tokenPricesMappingTable[this.symbolList[1]],
      currentPrice,
      minPrice,
      maxPrice,
    );
    assert(currentPrice > minPrice);
    assert(currentPrice < maxPrice);
    const swapAmountFromInputToToken0 =
      (tokenPricesMappingTable[this.symbolList[0]] * amountForToken0) /
      tokenPricesMappingTable[inputToken];
    const swapAmountFromInputToToken1 =
      (tokenPricesMappingTable[this.symbolList[1]] * amountForToken1) /
      tokenPricesMappingTable[inputToken];
    // get decimals from erc20 contract
    const approvalAmount = investmentAmountInThisPosition * approvalBufferParam;
    if (approvalAmount === 0) {
      throw new Error("Approval amount is 0. Cannot proceed with approving.");
    }
    const approveTxn = {
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      to: tokenAddress,
      data: encodeFunctionData({
        abi: permanentPortfolioJson.abi,
        functionName: "approve",
        args: [
          oneInchAddress,
          ethers.utils.parseUnits(
            approvalAmount.toFixed(decimalsOfChosenToken),
            decimalsOfChosenToken,
          ),
        ],
      }),
    };
    const [tokenSwapTxns, swapEstimateAmounts] = await this._swaps(
      tokenAddress,
      decimalsOfChosenToken,
      slippage,
      [swapAmountFromInputToToken0, swapAmountFromInputToToken1],
    );
    const token0Amount = swapEstimateAmounts[0];
    const token1Amount = swapEstimateAmounts[1];
    const approveTransactions = this._approves(token0Amount, token1Amount);
    let txns = [approveTxn, ...tokenSwapTxns, ...approveTransactions];
    const nftPositionUniqueKey = this._getNFTPositionUniqueKey();
    if (
      existingInvestmentPositionsInThisChain[nftPositionUniqueKey] !== undefined
    ) {
      txns.push(
        this._increateLiquidityToExistingNFT(
          Number(
            existingInvestmentPositionsInThisChain[nftPositionUniqueKey]
              .token_id,
          ),
          token0Amount,
          token1Amount,
          slippage,
        ),
      );
    } else {
      txns.push(this._mintLpNFT(token0Amount, token1Amount, slippage));
    }
    return txns;
  }

  async _swaps(
    chosenToken,
    decimalsOfChosenToken,
    slippage,
    amountForTokenArray,
  ) {
    let tokenSwapTxns = [];
    let swapEstimateAmounts = [];
    const tokenArray = [this.token0, this.token1];
    for (const token of tokenArray) {
      const index = tokenArray.indexOf(token);
      const amountForToken = amountForTokenArray[index];
      if (token.toLowerCase() === chosenToken.toLowerCase()) {
        swapEstimateAmounts.push(
          ethers.utils.parseUnits(
            amountForToken.toFixed(decimalsOfChosenToken),
            decimalsOfChosenToken,
          ),
        );
      } else {
        const [swapTxn, swapEstimateAmount] = await this._swap(
          chosenToken,
          token,
          ethers.utils.parseUnits(
            amountForToken.toFixed(decimalsOfChosenToken),
            decimalsOfChosenToken,
          ),
          slippage,
        );
        tokenSwapTxns.push(swapTxn);
        swapEstimateAmounts.push(
          Math.floor((swapEstimateAmount * (100 - slippage)) / 100),
        );
      }
    }
    swapEstimateAmounts.map((value) => {
      if (value === 0) {
        throw new Error("Token amount is 0. Cannot proceed with swapping.");
      }
    });

    return [tokenSwapTxns, swapEstimateAmounts];
  }

  _approves(token0Amount, token1Amount) {
    if (token0Amount === 0 || token1Amount === 0) {
      throw new Error("Token amount is 0. Cannot proceed with approving.");
    }
    let tokenApproveTransactions = [];
    for (const [token, tokenAmount] of [
      [this.token0, token0Amount],
      [this.token1, token1Amount],
    ]) {
      tokenApproveTransactions.push(
        this._approve(token, CamelotV3.lpTokenAddress, tokenAmount),
      );
    }
    return tokenApproveTransactions;
  }
  async zapOut() {
    throw new Error("This function is not implemented yet.");
  }
  async rebalance() {
    throw new Error("This function is not implemented yet.");
  }
  async _swap(fromTokenAddress, toTokenAddress, amount, slippage) {
    const swapCallData = await fetch1InchSwapData(
      this.chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      this.aaWalletAddress,
      slippage,
    );
    if (swapCallData["data"] === undefined) {
      throw new Error("Swap data is undefined. Cannot proceed with swapping.");
    }
    if (swapCallData["toAmount"] === 0) {
      throw new Error("To amount is 0. Cannot proceed with swapping.");
    }
    return [
      {
        to: oneInchAddress,
        data: swapCallData["data"],
        chain: CHAIN_ID_TO_CHAIN[this.chainId],
      },
      swapCallData["toAmount"],
    ];
  }
  _approve(tokenAddress, spenderAddress, amount) {
    const approvalAmount = Math.floor(amount * approvalBufferParam);
    if (approvalAmount === 0) {
      throw new Error("Approval amount is 0. Cannot proceed with approving.");
    }
    if (spenderAddress === nullAddress) {
      throw new Error(
        "Spender address is null. Cannot proceed with approving.",
      );
    }
    return {
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      to: tokenAddress,
      data: encodeFunctionData({
        abi: permanentPortfolioJson.abi,
        functionName: "approve",
        args: [spenderAddress, approvalAmount],
      }),
    };
  }

  _increateLiquidityToExistingNFT(
    tokenId,
    token0Amount,
    token1Amount,
    slippage,
  ) {
    const [amount0Desired, amount1Desired, amount0Min, amount1Min] =
      this._getAmountDesiredAndMin(token0Amount, token1Amount, slippage);
    const camelotCallData = encodeFunctionData({
      abi: CamelotNFTPositionManager,
      functionName: "increaseLiquidity",
      args: [
        {
          tokenId,
          amount0Desired,
          amount1Desired,
          amount0Min,
          amount1Min,
          deadline: Math.floor(Date.now() / 1000) + 600,
        },
      ],
    });
    return {
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      to: CamelotV3.lpTokenAddress,
      data: camelotCallData,
    };
  }

  _mintLpNFT(token0Amount, token1Amount, slippage) {
    const [amount0Desired, amount1Desired, amount0Min, amount1Min] =
      this._getAmountDesiredAndMin(token0Amount, token1Amount, slippage);
    const camelotCallData = encodeFunctionData({
      abi: CamelotNFTPositionManager,
      functionName: "mint",
      args: [
        {
          token0: this.token0,
          token1: this.token1,
          tickLower: this.tickLower,
          tickUpper: this.tickUpper,
          amount0Desired,
          amount1Desired,
          amount0Min,
          amount1Min,
          recipient: this.aaWalletAddress,
          deadline: Math.floor(Date.now() / 1000) + 600,
        },
      ],
    });
    return {
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      to: CamelotV3.lpTokenAddress,
      data: camelotCallData,
    };
  }

  _getAmountDesiredAndMin(token0Amount, token1Amount, slippage) {
    const amount0Desired = Math.floor((token0Amount * (100 - slippage)) / 100);
    const amount1Desired = Math.floor((token1Amount * (100 - slippage)) / 100);
    const amount0Min = Math.floor(token0Amount * slippageForLP);
    const amount1Min = Math.floor(token1Amount * slippageForLP);
    [amount0Desired, amount1Desired, amount0Min, amount1Min].forEach(
      (value, index) => {
        if (value === 0) {
          const keys = [
            "amount0Desired",
            "amount1Desired",
            "amount0Min",
            "amount1Min",
          ];
          throw new Error(`${keys[index]} is 0. Cannot proceed with minting.`);
        }
      },
    );
    return [amount0Desired, amount1Desired, amount0Min, amount1Min];
  }

  _getNFTPositionUniqueKey() {
    return `${CamelotV3.lpTokenAddress.toLowerCase()}/${this.token0.toLowerCase()}/${this.token1.toLowerCase()}/${
      this.tickLower
    }/${this.tickUpper}`;
  }
}
