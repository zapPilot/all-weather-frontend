import { ethers } from "ethers";
import { ERC20_ABI } from "../../node_modules/@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import { encodeFunctionData } from "viem";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json" assert { type: "json" };
import CamelotNFTPositionManager from "../../lib/contracts/CamelotNFTPositionManager.json" assert { type: "json" };
import { fetch1InchSwapData } from "../../utils/oneInch.js";
import { arbitrum } from "thirdweb/chains";
import {
  approvalBufferParam,
  slippageForLP,
  nullAddress,
} from "../slippageUtils.js";
const oneInchAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
const CamelotNFTPositionManagerAddress =
  "0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD15";
const PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_RPC_PROVIDER_URL,
);
export class CamelotV3 {
  static projectID = "camelot";
  static projectVersion = "v3";
  static protocolName = `${CamelotV3.projectID}-${CamelotV3.projectVersion}`;
  constructor(chaindId, symbolList, token0, token1, aaWalletAddress) {
    this.chainId = chaindId;
    this.symbolList = symbolList;
    this.token0 = token0;
    this.token1 = token1;
    this.aaWalletAddress = aaWalletAddress;
  }
  async invest(investmentAmountInThisPosition, chosenToken, slippage) {
    // get erc20 Contract Interface
    const erc20Instance = new ethers.Contract(chosenToken, ERC20_ABI, PROVIDER);

    // get decimals from erc20 contract
    const decimalsOfChosenToken = (await erc20Instance.functions.decimals())[0];
    const approvalAmount = investmentAmountInThisPosition * approvalBufferParam;
    if (approvalAmount === 0) {
      throw new Error("Approval amount is 0. Cannot proceed with approving.");
    }
    const approveTxn = {
      chain: arbitrum,
      to: chosenToken,
      data: encodeFunctionData({
        abi: permanentPortfolioJson.abi,
        functionName: "approve",
        args: [
          oneInchAddress,
          ethers.utils.parseUnits(
            String(approvalAmount),
            decimalsOfChosenToken,
          ),
        ],
      }),
    };
    const [tokenSwapTxns, swapEstimateAmounts] = await this._swaps(
      chosenToken,
      investmentAmountInThisPosition,
      decimalsOfChosenToken,
      slippage,
    );
    const token0Amount = swapEstimateAmounts[0];
    const token1Amount = swapEstimateAmounts[1];
    const approveTransactions = this._approves(token0Amount, token1Amount);
    return [
      approveTxn,
      ...tokenSwapTxns,
      ...approveTransactions,
      this._deposit(token0Amount, token1Amount, slippage),
    ];
  }

  async _swaps(
    chosenToken,
    investmentAmountInThisPosition,
    decimalsOfChosenToken,
    slippage,
  ) {
    let tokenSwapTxns = [];
    let swapEstimateAmounts = [];
    for (const token of [this.token0, this.token1]) {
      if (token.toLowerCase() === chosenToken.toLowerCase()) {
        swapEstimateAmounts.push(
          ethers.utils.parseUnits(
            String(investmentAmountInThisPosition / 2),
            decimalsOfChosenToken,
          ),
        );
      } else {
        const [swapTxn, swapEstimateAmount] = await this._swap(
          chosenToken,
          token,
          ethers.utils.parseUnits(
            String(investmentAmountInThisPosition / 2),
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
        this._approve(token, CamelotNFTPositionManagerAddress, tokenAmount),
      );
    }
    return tokenApproveTransactions;
  }
  async withdraw() {
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
        chain: arbitrum,
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
      chain: arbitrum,
      to: tokenAddress,
      data: encodeFunctionData({
        abi: permanentPortfolioJson.abi,
        functionName: "approve",
        args: [spenderAddress, approvalAmount],
      }),
    };
  }
  _deposit(token0Amount, token1Amount, slippage) {
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
    const camelotCallData = encodeFunctionData({
      abi: CamelotNFTPositionManager,
      functionName: "mint",
      args: [
        {
          token0: this.token0,
          token1: this.token1,
          tickLower: -887220,
          tickUpper: 887220,
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
      chain: arbitrum,
      to: CamelotNFTPositionManagerAddress,
      data: camelotCallData,
    };
  }
}
