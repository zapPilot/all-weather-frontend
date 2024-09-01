import ApolloXABI from "../../lib/contracts/ApolloX.json" assert { type: "json" };
import ERC20_ABI from "../../lib/contracts/ERC20.json" assert { type: "json" };
import { arbitrum } from "thirdweb/chains";
import axios from "axios";
import { ethers } from "ethers";
import { PROVIDER } from "../../utils/general.js";
import axiosRetry from "axios-retry";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { approve } from "../../utils/general.js";
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
      chain: arbitrum,
      abi: ERC20_ABI,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xB3879E95a4B8e3eE570c232B19d520821F540E48",
      chain: arbitrum,
      abi: ApolloXABI,
    });
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      // PancakeSwap Stake would change this address from time to time
      address: customParams.stakeFarmContractAddress,
      chain: arbitrum,
      abi: SmartChefInitializable,
    });
    this._checkIfParamsAreSet();
  }
  zapInSteps(tokenInAddress) {
    return 4;
  }
  zapOutSteps(tokenInAddress) {
    return 5;
  }
  claimAndSwapSteps() {
    return 3;
  }
  rewards() {
    return {
      rewards: [
        {
          symbol: "arb",
          coinmarketcapApiId: 11841,
          address: "0x912ce59144191c1204e64559fe8253a0e49e6548",
          decimals: this.assetDecimals,
        },
      ],
    };
  }
  async pendingRewards(recipient, tokenPricesMappingTable, updateProgress) {
    const stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      SmartChefInitializable,
      PROVIDER,
    );
    updateProgress(
      `fetching pending rewards from ${this.stakeFarmContract.address}`,
    );
    const pendingReward = (
      await stakeFarmContractInstance.functions.pendingReward(recipient)
    )[0];
    let rewardBalance = {};
    for (const token of this.rewards().rewards) {
      rewardBalance[token.address] = {
        symbol: token.symbol,
        balance: pendingReward,
        usdDenominatedValue:
          (tokenPricesMappingTable[token.symbol] * pendingReward) /
          Math.pow(10, token.decimals),
        decimals: token.decimals,
      };
    }
    return rewardBalance;
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
    const latestPrice = await this._fetchAlpPrice(updateProgress);
    // on Arbitrum, we don't stake and then put ALP to pancakeswap for higher APY
    const estimatedAlpAmount =
      ((tokenPricesMappingTable[inputToken] * amountToZapIn) /
        Math.pow(10, bestTokenToZapInDecimal) /
        latestPrice) *
      Math.pow(10, this.assetDecimals);
    const minAlpAmount = Math.floor(
      (estimatedAlpAmount * (100 - slippage)) / 100,
    );
    const mintTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "mintAlp", // <- this gets inferred from the contract
      params: [bestTokenAddressToZapIn, amountToZapIn, minAlpAmount, false],
    });
    const approveAlpTxn = approve(
      this.assetContract.address,
      this.stakeFarmContract.address,
      minAlpAmount,
      updateProgress,
    );
    const depositTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "deposit", // <- this gets inferred from the contract
      params: [minAlpAmount],
    });
    return [mintTxn, approveAlpTxn, depositTxn];
  }
  async customWithdrawAndClaim(
    recipient,
    percentage,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    const stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      SmartChefInitializable,
      PROVIDER,
    );
    const amount = Math.floor(
      (await stakeFarmContractInstance.functions.userInfo(recipient)).amount *
        percentage,
    );
    const withdrawTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "withdraw",
      params: [amount],
    });

    const approveAlpTxn = approve(
      this.assetContract.address,
      this.protocolContract.address,
      ethers.utils.parseUnits(
        amount.toFixed(this.assetDecimals),
        this.assetDecimals,
      ),
      updateProgress,
    );
    const latestPrice = await this._fetchAlpPrice(updateProgress);
    const estimatedZapOutUsdValue =
      ((amount / Math.pow(10, this.assetDecimals)) *
        latestPrice *
        (100 - slippage)) /
      100;
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
      params: [bestTokenAddressToZapOut, amount, minOutAmount, recipient],
    });
    return [
      [withdrawTxn, approveAlpTxn, burnTxn],
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
      minOutAmount,
    ];
  }
  async customClaim(recipient, tokenPricesMappingTable, updateProgress) {
    const pendingRewards = await this.pendingRewards(
      recipient,
      tokenPricesMappingTable,
      updateProgress,
    );
    const claimTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "deposit",
      params: [0],
    });
    return [[claimTxn], pendingRewards];
  }
  async usdBalanceOf(recipient) {
    const stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      SmartChefInitializable,
      PROVIDER,
    );
    const userInfo = (
      await stakeFarmContractInstance.functions.userInfo(recipient)
    ).amount;
    const latestAlpPrice = await this._fetchAlpPrice(() => {});
    return (userInfo / Math.pow(10, this.assetDecimals)) * latestAlpPrice;
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
    updateProgress("fetching ALP price");
    return latestPrice;
  }
  _getTheBestTokenAddressToZapIn() {
    // TODO: minor, but we can read the composition of ALP to get the cheapest token to zap in
    const usdcBridgedAddress = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8";
    return [usdcBridgedAddress, 6];
  }
  _getTheBestTokenAddressToZapOut() {
    // TODO: minor, but we can read the composition of ALP to get the cheapest token to zap in
    const usdcBridgedAddress = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8";
    return ["usdc.e", usdcBridgedAddress, 6];
  }
}
