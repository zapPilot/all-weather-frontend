import { ethers } from "ethers";
import { ERC20_ABI } from "../../node_modules/@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import { encodeFunctionData } from "viem";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json" assert { type: "json" };
import CamelotNFTPositionManager from "../../lib/contracts/CamelotNFTPositionManager.json" assert { type: "json" };
import { fetch1InchSwapData } from "../../utils/oneInch.js";

// const approvalBufferParam = 1.2;
const approvalBufferParam = 100;

//  `Error: execution reverted: STF` means there's no enough tokens to safe transfer from
const slippage = [0.1, 0.5, 1, 10, 50];

// would get `Error: execution reverted: Price slippage check` if it hit the amount0Min and amount1Min when providing liquidity
const slippageOfLP = [0.95, 0.9, 0.8, 0.7, 0.1];

const oneInchAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
const CamelotNFTPositionManagerAddress =
  "0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD15";

export class CamelotV3 {
  static poolName = "camelot-v3";

  constructor(chaindId, token0, token1, primeSdk, aaWalletAddress) {
    this.chainId = chaindId;
    this.token0 = token0;
    this.token1 = token1;
    this.primeSdk = primeSdk;
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_BUNDLER_URL,
    );
    this.aaWalletAddress = aaWalletAddress;
  }
  poolName() {
    return CamelotV3.poolName;
  }
  async invest(investmentAmountInThisPosition, chosenToken, retryIndex) {
    // get erc20 Contract Interface
    const erc20Instance = new ethers.Contract(
      chosenToken,
      ERC20_ABI,
      this.provider,
    );

    // get decimals from erc20 contract
    const decimals = (await erc20Instance.functions.decimals())[0];
    await this.primeSdk.addUserOpsToBatch({
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
    });
    const [token0Amount, token1Amount] = await this._concurrentSwap(
      chosenToken,
      investmentAmountInThisPosition,
      decimals,
      retryIndex,
    );
    await this._concurrentApprove(token0Amount, token1Amount);
    await this._deposit(token0Amount, token1Amount, retryIndex);
  }

  async _concurrentSwap(
    chosenToken,
    investmentAmountInThisPosition,
    decimals,
    retryIndex,
  ) {
    let tokenSwapPromises = [];
    for (const token of [this.token0, this.token1]) {
      tokenSwapPromises.push(
        this._swap(
          chosenToken,
          token,
          ethers.utils.parseUnits(
            String(investmentAmountInThisPosition / 2),
            decimals,
          ),
          slippage[retryIndex],
        ),
      );
    }
    const [token0Amount, token1Amount] = await Promise.all(tokenSwapPromises);
    return [token0Amount, token1Amount];
  }

  async _concurrentApprove(token0Amount, token1Amount) {
    let tokenApprovePromises = [];
    for (const [token, tokenAmount] of [
      [this.token0, token0Amount],
      [this.token1, token1Amount],
    ]) {
      tokenApprovePromises.push(
        this._approve(token, CamelotNFTPositionManagerAddress, tokenAmount),
      );
    }
    await Promise.all(tokenApprovePromises);
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
    await this.primeSdk.addUserOpsToBatch({
      to: oneInchAddress,
      data: swapCallDataFrom1inch["tx"]["data"],
    });
    return swapCallDataFrom1inch["toAmount"];
  }
  async _approve(tokenAddress, spenderAddress, amount) {
    await this.primeSdk.addUserOpsToBatch({
      to: tokenAddress,
      data: encodeFunctionData({
        abi: permanentPortfolioJson.abi,
        functionName: "approve",
        args: [
          spenderAddress,
          ethers.BigNumber.from(amount).mul(approvalBufferParam),
        ],
      }),
    });
  }
  async _deposit(token0Amount, token1Amount, retryIndex) {
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
    await this.primeSdk.addUserOpsToBatch({
      to: CamelotNFTPositionManagerAddress,
      data: camelotCallData,
    });
  }
}
