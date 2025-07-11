import logger from "../../utils/logger";
import ApolloXABI from "../../lib/contracts/ApolloX.json" assert { type: "json" };
import ERC20_ABI from "../../lib/contracts/ERC20.json" assert { type: "json" };
import axios from "axios";
import { ethers } from "ethers";
import { PROVIDER } from "../../utils/general.js";
import axiosRetry from "axios-retry";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { approve, CHAIN_ID_TO_CHAIN } from "../../utils/general.js";
import BaseProtocol from "../BaseProtocol.js";
// For PancakeSwap Stake
import SmartChefInitializable from "../../lib/contracts/PancakeSwap/SmartChefInitializable.json" assert { type: "json" };

axiosRetry(axios, { retryDelay: axiosRetry.exponentialDelay });
export class BaseApolloX extends BaseProtocol {
  constructor(chain, chaindId, symbolList, mode, customParams) {
    super(chain, chaindId, symbolList, mode, customParams);
    // arbitrum's Apollox is staked on PancakeSwap
    this.protocolName = "pancakeswap";
    this.protocolVersion = "v3";
    this.assetDecimals = 18;
    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xbc76b3fd0d18c7496c0b04aea0fe7c3ed0e4d9c9",
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: ERC20_ABI,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xB3879E95a4B8e3eE570c232B19d520821F540E48",
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: ApolloXABI,
    });
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      // PancakeSwap Stake would change this address from time to time
      address: "0xD2e71125ec0313874d578454E28086fba7444c0c",
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: SmartChefInitializable,
    });
    this._checkIfParamsAreSet();

    this.hardcodedProtocolFee = 0.003; // 0.3%
  }
  rewards() {
    return [
      {
        symbol: "arb",
        priceId: {
          coinmarketcapApiId: 11841,
        },
        address: "0x912ce59144191c1204e64559fe8253a0e49e6548",
        decimals: this.assetDecimals,
      },
    ];
  }
  async pendingRewards(owner, tokenPricesMappingTable, updateProgress) {
    // NOTE: we don't have stake farm reward for now
    return {};
    const stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      SmartChefInitializable,
      PROVIDER(this.chain),
    );
    const pendingReward = (
      await stakeFarmContractInstance.functions.pendingReward(owner)
    )[0];
    let rewardBalance = {};
    for (const token of this.rewards()) {
      rewardBalance[token.address] = {
        symbol: token.symbol,
        balance: pendingReward,
        usdDenominatedValue:
          (tokenPricesMappingTable[token.symbol] * pendingReward) /
          Math.pow(10, token.decimals),
        decimals: token.decimals,
        chain: this.chain,
      };
    }
    return rewardBalance;
  }
  async customDeposit(
    owner,
    inputToken,
    bestTokenAddressToZapIn,
    amountToZapIn,
    bestTokenToZapInDecimal,
    tokenPricesMappingTable,
    slippage,
    updateProgress,
  ) {
    const approveForZapInTxn = approve(
      bestTokenAddressToZapIn,
      this.protocolContract.address,
      amountToZapIn,
      updateProgress,
      this.chainId,
    );

    const latestPrice = await this._fetchAlpPrice(updateProgress);
    // on Arbitrum, we don't stake and then put ALP to pancakeswap for higher APY
    const inputTokenUsdValue =
      (tokenPricesMappingTable[inputToken] * amountToZapIn) /
      Math.pow(10, bestTokenToZapInDecimal);
    const estimatedAlpAmount = inputTokenUsdValue / latestPrice;
    const minAlpAmount = Math.floor(
      (estimatedAlpAmount * (100 - slippage)) / 100,
    );
    const mintTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "mintAlp", // <- this gets inferred from the contract
      params: [bestTokenAddressToZapIn, amountToZapIn, minAlpAmount, false],
    });
    const tradingLoss = -inputTokenUsdValue * this.hardcodedProtocolFee;
    return [[approveForZapInTxn, mintTxn], tradingLoss];
  }
  async customWithdrawAndClaim(
    owner,
    amount,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    const approveAlpTxn = approve(
      this.assetContract.address,
      this.protocolContract.address,
      amount,
      updateProgress,
      this.chainId,
    );
    const latestPrice = await this._fetchAlpPrice(updateProgress);
    const estimatedZapOutUsdValue =
      (amount * latestPrice * (100 - slippage)) / 100;
    // TODO: we might enable zap out to other token down the road
    const minOutAmount = Math.floor(estimatedZapOutUsdValue * 1e6);
    const [
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
    ] = this._getTheBestTokenAddressToZapOut();
    const burnTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "burnAlp", // <- this gets inferred from the contract
      params: [bestTokenAddressToZapOut, amount, minOutAmount, owner],
    });
    const tradingLoss = -estimatedZapOutUsdValue * this.hardcodedProtocolFee;
    return [
      [approveAlpTxn, burnTxn],
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
      minOutAmount,
      tradingLoss,
    ];
  }
  async customClaim(owner, tokenPricesMappingTable, updateProgress) {
    return [[], {}];
    // NOTE: the rewardings campaign is not available for now
    // const pendingRewards = await this.pendingRewards(
    //   owner,
    //   tokenPricesMappingTable,
    //   updateProgress,
    // );
    // const claimTxn = prepareContractCall({
    //   contract: this.stakeFarmContract,
    //   method: "deposit",
    //   params: [0],
    // });
    // return [[claimTxn], pendingRewards];
  }

  async usdBalanceOf(owner, tokenPricesMappingTable) {
    const [balance, latestAlpPrice] = await Promise.all([
      this.assetBalanceOf(owner),
      this._fetchAlpPrice(() => {}),
    ]);
    return balance * latestAlpPrice;
  }
  async assetUsdPrice(tokenPricesMappingTable) {
    return await this._fetchAlpPrice(() => {});
  }
  async _fetchAlpPrice(updateProgress) {
    const response = await axios({
      method: "post",
      url: "https://www.apollox.finance/bapi/futures/v1/public/future/symbol/history-price",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        channel: "ARB",
        currency: "alb",
        dataSize: 1,
      },
      referrer: "https://www.apollox.finance/en/ALP",
    });
    const latestPrice = response.data.data[0].price;
    return latestPrice / Math.pow(10, this.assetDecimals);
  }
  _getTheBestTokenAddressToZapIn(inputToken, tokenAddress, InputTokenDecimals) {
    // TODO: minor, but we can read the composition of ALP to get the cheapest token to zap in
    const usdcBridgedAddress = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8";
    return ["usdc.e", usdcBridgedAddress, 6];
  }
  _getTheBestTokenAddressToZapOut() {
    // TODO: minor, but we can read the composition of ALP to get the cheapest token to zap in
    const usdcBridgedAddress = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8";
    return ["usdc.e", usdcBridgedAddress, 6];
  }
  async lockUpPeriod(address) {
    try {
      if (!address || !ethers.utils.isAddress(address)) {
        throw new Error("Invalid address");
      }

      const protocolContractInstance = new ethers.Contract(
        this.protocolContract.address,
        ApolloXABI,
        PROVIDER(this.chain),
      );

      const lastMintedTimestamp =
        await protocolContractInstance.lastMintedTimestamp(address);
      // Return 0 if user has never minted
      if (lastMintedTimestamp.eq(0)) {
        return 0;
      }

      const coolingDuration = await protocolContractInstance.coolingDuration();
      const currentTimestamp = Math.floor(Date.now() / 1000);

      // Convert BigNumber to number for arithmetic
      const unlockTimestamp =
        lastMintedTimestamp.toNumber() + coolingDuration.toNumber();
      if (unlockTimestamp > currentTimestamp) {
        return unlockTimestamp - currentTimestamp;
      }
      return 0;
    } catch (error) {
      logger.error("Error fetching lock-up period:", error);
      return 0;
    }
  }
  async _stake(amount, updateProgress) {
    // NOTE: currently no staking campaign on Arbitrum, so need to return [] for the correct "dust" calculation
    return [];
    // const approveAlpTxn = approve(
    //   this.assetContract.address,
    //   this.stakeFarmContract.address,
    //   amount,
    //   updateProgress,
    //   this.chainId,
    // );
    // const depositTxn = prepareContractCall({
    //   contract: this.stakeFarmContract,
    //   method: "deposit", // <- this gets inferred from the contract
    //   params: [amount],
    // });
    // return [approveAlpTxn, depositTxn];
  }
  async _unstake(owner, percentage, updateProgress) {
    const assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    const percentagePrecision = 10000;
    const percentageBN = ethers.BigNumber.from(
      BigInt(Math.floor(percentage * percentagePrecision)),
    );
    const balance = await assetContractInstance.balanceOf(owner);
    const amount = balance.mul(percentageBN).div(percentagePrecision);
    return [[], amount];
  }
}
