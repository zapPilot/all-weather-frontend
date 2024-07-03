import { ethers } from "ethers";
import { ERC20_ABI } from "../../node_modules/@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import { encodeFunctionData } from "viem";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json" assert { type: "json" };
import CamelotNFTPositionManager from "../../lib/contracts/CamelotNFTPositionManager.json" assert { type: "json" };
import { fetch1InchSwapData } from "../../utils/oneInch.js";
import { arbitrum } from "thirdweb/chains";
const approvalBufferParam = 1.2;
//  `Error: execution reverted: STF` means there's no enough tokens to safe transfer from
// number: min: 0, max: 50
const slippage = [1, 2, 3, 5, 10];

// would get `Error: execution reverted: Price slippage check` if it hit the amount0Min and amount1Min when providing liquidity
const slippageOfLP = [0.95, 0.9, 0.8, 0.7, 0.6];

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
  async invest(investmentAmountInThisPosition, chosenToken, retryIndex) {
    // get erc20 Contract Interface
    const erc20Instance = new ethers.Contract(chosenToken, ERC20_ABI, PROVIDER);

    // get decimals from erc20 contract
    const decimals = (await erc20Instance.functions.decimals())[0];
    const approveTxn = {
      chain: arbitrum,
      to: chosenToken,
      data: encodeFunctionData({
        abi: permanentPortfolioJson.abi,
        functionName: "approve",
        args: [
          oneInchAddress,
          ethers.utils.parseUnits(
            String(
              (investmentAmountInThisPosition * approvalBufferParam).toFixed(
                decimals,
              ),
            ),
            decimals,
          ),
        ],
      }),
    };
    const [tokenSwapTxns, swapEstimateAmounts] = await this._swaps(
      chosenToken,
      investmentAmountInThisPosition,
      decimals,
      retryIndex,
    );
    const token0Amount = swapEstimateAmounts[0];
    const token1Amount = swapEstimateAmounts[1];
    const approveTransactions = this._approves(token0Amount, token1Amount);
    return [
      approveTxn,
      ...tokenSwapTxns,
      ...approveTransactions,
      this._deposit(token0Amount, token1Amount, retryIndex),
    ];
  }

  async _swaps(
    chosenToken,
    investmentAmountInThisPosition,
    decimals,
    retryIndex,
  ) {
    let tokenSwapTxns = [];
    let swapEstimateAmounts = [];
    for (const token of [this.token0, this.token1]) {
      if (token.toLowerCase() === chosenToken.toLowerCase()) {
        swapEstimateAmounts.push(
          ethers.utils.parseUnits(
            String(investmentAmountInThisPosition / 2),
            decimals,
          ),
        );
      } else {
        const [swapTxn, swapEstimateAmount] = await this._swap(
          chosenToken,
          token,
          ethers.utils.parseUnits(
            String(investmentAmountInThisPosition / 2),
            decimals,
          ),
          slippage[retryIndex],
        );
        tokenSwapTxns.push(swapTxn);
        swapEstimateAmounts.push(
          Math.floor((swapEstimateAmount * (100 - slippage[retryIndex])) / 100),
        );
      }
    }
    return [tokenSwapTxns, swapEstimateAmounts];
  }

  _approves(token0Amount, token1Amount) {
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
    const swapCallDataFrom1inch = await fetch1InchSwapData(
      this.chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      this.aaWalletAddress,
      slippage,
    );
    return [
      {
        to: oneInchAddress,
        data: swapCallDataFrom1inch["tx"]["data"],
        chain: arbitrum,
      },
      swapCallDataFrom1inch["toAmount"],
    ];
  }
  _approve(tokenAddress, spenderAddress, amount) {
    return {
      chain: arbitrum,
      to: tokenAddress,
      data: encodeFunctionData({
        abi: permanentPortfolioJson.abi,
        functionName: "approve",
        args: [spenderAddress, Math.floor(amount * approvalBufferParam)],
      }),
    };
  }
  _deposit(token0Amount, token1Amount, retryIndex) {
    const camelotCallData = encodeFunctionData({
      abi: CamelotNFTPositionManager,
      functionName: "mint",
      args: [
        {
          token0: this.token0,
          token1: this.token1,
          tickLower: -887220,
          tickUpper: 887220,
          amount0Desired: token0Amount,
          amount1Desired: token1Amount,
          amount0Min: Math.floor(token0Amount * slippageOfLP[retryIndex]),
          amount1Min: Math.floor(token1Amount * slippageOfLP[retryIndex]),
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
