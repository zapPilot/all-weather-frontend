import { ethers } from "ethers";
import { PrimeSdk, DataUtils, graphqlEndpoints } from "@etherspot/prime-sdk";
// import { printOp, sleep } from "@etherspot/common";
// import { ERC20_ABI } from "@etherspot/prime-sdk/helpers";
import * as dotenv from "dotenv";
import { printOp } from "./node_modules/@etherspot/prime-sdk/dist/sdk/common/OperationUtils.js";
import { sleep } from "./node_modules/@etherspot/prime-sdk/dist/sdk/common/index.js";
import { ERC20_ABI } from "./node_modules/@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import { encodeFunctionData } from "viem";
import permanentPortfolioJson from "./lib/contracts/PermanentPortfolioLPToken.json" assert { type: "json" };

// import { PrimeSdk, DataUtils, BatchUserOpsRequest } from '@etherspot/prime-sdk';

dotenv.config({ path: ".env.local" });

// add/change these values
const recipient = "0x78000b0605E81ea9df54b33f72ebC61B5F5c8077"; // recipient wallet address
const value = "0.01"; // transfer value
const tokenAddress = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";

async function main() {
  // initializating sdk...
  const primeSdk = new PrimeSdk(
    { privateKey: process.env.WALLET_PRIVATE_KEY },
    {
      chainId: Number(process.env.CHAIN_ID),
      projectKey: "public-prime-testnet-key",
    },
  );
  console.log("address: ", primeSdk.state.EOAAddress);

  // get address of EtherspotWallet...
  const address = await primeSdk.getCounterFactualAddress();
  console.log("\x1b[33m%s\x1b[0m", `EtherspotWallet address: ${address}`);
  const dataService = new DataUtils(
    "public-prime-testnet-key",
    graphqlEndpoints.QA,
  );
  const balances = await dataService.getAccountBalances({
    account: address,
    chainId: 5,
  });
  console.log("\x1b[33m%s\x1b[0m", `EtherspotWallet balances:`, balances);

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BUNDLER_URL,
  );
  // get erc20 Contract Interface
  const erc20Instance = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  // get decimals from erc20 contract
  const decimals = await erc20Instance.functions.decimals();
  console.log("decimals: ", decimals);
  // get transferFrom encoded data
  const encodedFunctionData = encodeFunctionData({
    abi: permanentPortfolioJson.abi,
    functionName: "transfer",
    args: [recipient, ethers.utils.parseUnits(value, decimals)],
  });

  // clear the transaction batch
  await primeSdk.clearUserOpsFromBatch();

  // add transactions to the batch
  let userOpsBatch = await primeSdk.addUserOpsToBatch({
    to: tokenAddress,
    data: encodeFunctionData({
      abi: permanentPortfolioJson.abi,
      functionName: "approve",
      args: [spender, ethers.utils.parseUnits(value, decimals)],
    }),
  });
  userOpsBatch = await primeSdk.addUserOpsToBatch({
    to: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    // 0x1111111254EEB25477B68fb85Ed929f73A960582
    data: encodedFunctionData,
  });
  console.log("transactions: ", userOpsBatch);

  // estimate transactions added to the batch and get the fee data for the UserOp
  const op = await primeSdk.estimate();
  console.log(`Estimate UserOp: ${await printOp(op)}`);

  // sign the UserOp and sending to the bundler...
  const uoHash = await primeSdk.send(op);
  console.log(`UserOpHash: ${uoHash}`);

  // get transaction hash...
  console.log("Waiting for transaction...");
  let userOpsReceipt = null;
  const timeout = Date.now() + 60000; // 1 minute timeout
  while (userOpsReceipt == null && Date.now() < timeout) {
    await sleep(2);
    userOpsReceipt = await primeSdk.getUserOpReceipt(uoHash);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit());
