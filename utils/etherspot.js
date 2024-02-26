import { BigNumber, ethers } from "ethers";
import {
  PrimeSdk,
  DataUtils,
  graphqlEndpoints,
  EtherspotBundler,
} from "@etherspot/prime-sdk";
import * as dotenv from "dotenv";
import { printOp } from "../node_modules/@etherspot/prime-sdk/dist/sdk/common/OperationUtils.js";
import { sleep } from "../node_modules/@etherspot/prime-sdk/dist/sdk/common/index.js";
import { ERC20_ABI } from "../node_modules/@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import { encodeFunctionData } from "viem";
import permanentPortfolioJson from "../lib/contracts/PermanentPortfolioLPToken.json" assert { type: "json" };
import EntryPointJson from "../lib/contracts/EntryPoint.json" assert { type: "json" };
import CamelotNFTPositionManager from "../lib/contracts/CamelotNFTPositionManager.json" assert { type: "json" };
import Weth from "../lib/contracts/Weth.json" assert { type: "json" };
import { fetch1InchSwapData } from "./oneInch";

// import { PrimeSdk, DataUtils, BatchUserOpsRequest } from '@etherspot/prime-sdk';

// add/change these values
const recipient = "0x3144b7E3a4518541AEB4ceC7fC7A6Dd82f05Ae8B"; // recipient wallet address
const value = "0.5"; // transfer value
const usdcAddress = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const usdtAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const pendleAddress = "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8";
const oneInchAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";
const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const CamelotNFTPositionManagerAddress =
  "0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD15";
export async function investByAAWallet(investmentAmount, chosenToken) {
  console.log("Investing by AA Wallet...");
  console.log("chosenToken", chosenToken);
  const portfolioHelper = await getPortfolioHelper("AllWeatherPortfolio");
  const transactionHash = portfolioHelper.diversify(
    investmentAmount,
    chosenToken,
  );
  // const dataService = new DataUtils(
  //     "public-prime-testnet-key",
  //     graphqlEndpoints.QA,
  // );
  // const balances = await dataService.getAccountBalances({
  //     account: aaWalletAddress,
  //     chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
  // });
  // console.log("\x1b[33m%s\x1b[0m", `EtherspotWallet balances:`, balances);
}

async function getPortfolioHelper(portfolioName) {
  let portfolioHelper;
  if (portfolioName === "AllWeatherPortfolio") {
    portfolioHelper = new AllWeatherPortfolio();
  }
  await portfolioHelper.initialize();
  return portfolioHelper;
}

class AllWeatherPortfolio {
  constructor() {
    this.name = name;
    // initializating sdk...
    const customBundlerUrl = "";
    this.primeSdk = new PrimeSdk(
      { privateKey: process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY },
      {
        chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
        projectKey: "all-weather-dev",
        bundlerProvider: new EtherspotBundler(
          Number(process.env.NEXT_PUBLIC_CHAIN_ID),
          process.env.NEXT_PUBLIC_ETHERSPOT_PROJECT_KEY,
          customBundlerUrl,
        ),
      },
    ); // Testnets dont need apiKey on bundlerProvider
    this.EOAAddress = this.primeSdk.state.EOAAddress;
  }
  async initialize() {
    // get address of EtherspotWallet...
    this.aaWalletAddress = await this.primeSdk.getCounterFactualAddress();
    console.log("aaWalletAddress", this.aaWalletAddress);
    this.strategy = {
      long_term_bond: {},
      intermediate_term_bond: {
        42161: [
          {
            interface: new CamelotV3(
              42161,
              pendleAddress,
              wethAddress,
              this.primeSdk,
              this.aaWalletAddress,
            ),
            weight: 0.18,
          },
        ],
      },
      commodities: {},
      gold: {},
      large_cap_us_stocks: {},
      small_cap_us_stocks: {},
      non_us_developed_market_stocks: {},
      non_us_emerging_market_stocks: {},
    };
  }

  async diversify(investmentAmount, chosenToken) {
    // clear the transaction batch
    await this.primeSdk.clearUserOpsFromBatch();
    await this._diversify(investmentAmount, chosenToken);
    const uoHash = this._signTransaction();
    return uoHash;
  }

  async _diversify(investmentAmount, chosenToken) {
    for (const [category, protocolsInThisCategory] of Object.entries(
      this.strategy,
    )) {
      for (const [chainId, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocols) {
          console.log(`Investing in ${category}...`);
          await protocol.interface.invest(
            investmentAmount * protocol.weight,
            chosenToken,
          );
          console.log(`Investment in ${category} completed...`);
        }
      }
    }
    // estimate transactions added to the batch and get the fee data for the UserOp
    console.log("Estimating UserOp...");
    const op = await this.primeSdk.estimate();
    console.log(`Estimate UserOp: ${await printOp(op)}`);
  }

  _signTransaction() {
    //   // sign the UserOp and sending to the bundler...
    //   const uoHash = await primeSdk.send(op);
    //   console.log(`UserOpHash: ${uoHash}`);
    //   // get transaction hash...
    //   console.log("Waiting for transaction...");
    //   let userOpsReceipt = null;
    //   const timeout = Date.now() + 60000; // 1 minute timeout
    //   while (userOpsReceipt == null && Date.now() < timeout) {
    //     await sleep(2);
    //     userOpsReceipt = await primeSdk.getUserOpReceipt(uoHash);
    //   }
    // return uoHash;
  }
}

class CamelotV3 {
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

  async invest(investmentAmountInThisPosition, chosenToken) {
    // get erc20 Contract Interface
    const erc20Instance = new ethers.Contract(
      chosenToken,
      ERC20_ABI,
      this.provider,
    );

    // get decimals from erc20 contract
    const decimals = await erc20Instance.functions.decimals();
    await this.primeSdk.addUserOpsToBatch({
      to: chosenToken,
      data: encodeFunctionData({
        abi: permanentPortfolioJson.abi,
        functionName: "approve",
        args: [
          oneInchAddress,
          ethers.utils.parseUnits(
            String(investmentAmountInThisPosition),
            decimals,
          ),
        ],
      }),
    });

    const token0Amount = await this._swap(
      chosenToken,
      pendleAddress,
      ethers.utils.parseUnits(
        String(investmentAmountInThisPosition / 2),
        decimals,
      ),
      0.1,
    );
    const token1Amount = await this._swap(
      chosenToken,
      wethAddress,
      ethers.utils.parseUnits(
        String(investmentAmountInThisPosition / 2),
        decimals,
      ),
      0.1,
    );
    await this._approve(
      pendleAddress,
      CamelotNFTPositionManagerAddress,
      token0Amount,
    );
    await this._approve(
      wethAddress,
      CamelotNFTPositionManagerAddress,
      token1Amount,
    );
    await this._deposit(token0Amount, token1Amount);
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
        args: [spenderAddress, ethers.BigNumber.from(amount)],
        // args: [spenderAddress, ethers.utils.parseUnits(amount, 18)],
      }),
    });
  }
  async _deposit(token0Amount, token1Amount) {
    const slippageOfLP = 0.5;
    // const camelotCallData = encodeFunctionData({
    //   abi: CamelotNFTPositionManager,
    //   functionName: "mint",
    //   args: [
    //     {
    //       token0: pendleAddress,
    //       token1: wethAddress,
    //       tickLower: -887220,
    //       tickUpper: 887220,
    //       amount0Desired: token0Amount,
    //       amount1Desired: token1Amount,
    //       amount0Min: Math.floor(token0Amount * slippageOfLP),
    //       amount1Min: Math.floor(token1Amount * slippageOfLP),
    //       recipient: this.aaWalletAddress,
    //       deadline: Math.floor(Date.now() / 1000) + 300,
    //     },
    //   ],
    // });
    // await this.primeSdk.addUserOpsToBatch({
    //   to: CamelotNFTPositionManagerAddress,
    //   data: camelotCallData,
    // });
  }
}
