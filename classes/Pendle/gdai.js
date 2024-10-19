import PendleMarketV3 from "../../lib/contracts/Pendle/PendleMarketV3.json" assert { type: "json" };
import ActionAddRemoveLiqV3 from "../../lib/contracts/Pendle/ActionAddRemoveLiqV3.json" assert { type: "json" };
import PendleBoosterSidechain from "../../lib/contracts/Pendle/PendleBoosterSidechain.json" assert { type: "json" };
import EqbMinterSidechain from "../../lib/contracts/Pendle/EqbMinterSidechain.json" assert { type: "json" };
import BaseRewardPool from "../../lib/contracts/Pendle/BaseRewardPool.json" assert { type: "json" };
import XEqbToken from "../../lib/contracts/Equilibria/XEqbToken.json" assert { type: "json" };
import EqbZap from "../../lib/contracts/Equilibria/EqbZap.json" assert { type: "json" };
import { arbitrum } from "thirdweb/chains";
import axios from "axios";
import { ethers } from "ethers";
import { PROVIDER } from "../../utils/general.js";
import axiosRetry from "axios-retry";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb.js";
import { approve } from "../../utils/general.js";
import BaseProtocol1 from "../BaseProtocol1.js";
import { ERC20_ABI } from "@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";

axiosRetry(axios, { retryDelay: axiosRetry.exponentialDelay });
export class Gdai extends BaseProtocol1 {
  constructor(chain, chaindId, symbolList, mode, customParams) {
    super(chain, chaindId, symbolList, mode, customParams);
    // arbitrum's Apollox is staked on PancakeSwap
    this.protocolName = "equilibria";
    this.protocolVersion = "0";
    this.assetDecimals = 18;
    this.pidOfEquilibria = customParams.pidOfEquilibria;
    this.PENDLE_TOKEN_ADDR = "0x0c880f6761f1af8d9aa9c466984b80dab9a8c9e8";
    this.EQB_TOKEN_ADDR = "0xbfbcfe8873fe28dfa25f1099282b088d52bbad9c";
    this.XEQB_TOKEN_ADDR = "0x96c4a48abdf781e9c931cfa92ec0167ba219ad8e";
    this.OARB_TOKEN_ADDR = "0x03b611858f8e8913f8db7d9fdbf59e352b0c83e8";
    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: customParams.assetAddress,
      chain: arbitrum,
      abi: PendleMarketV3,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0x888888888889758F76e7103c6CbF23ABbF58F946",
      chain: arbitrum,
      abi: ActionAddRemoveLiqV3,
    });
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF",
      chain: arbitrum,
      abi: PendleBoosterSidechain,
    });
    this.eqbStakeFarmWithdrawContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xc7517f481Cc0a645e63f870830A4B2e580421e32",
      chain: arbitrum,
      abi: EqbZap,
    });
    this.xEqbContract = getContract({
      client: THIRDWEB_CLIENT,
      address: this.XEQB_TOKEN_ADDR,
      chain: arbitrum,
      abi: XEqbToken,
    });

    this.assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      PendleMarketV3,
      PROVIDER,
    );
    this.stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      PendleBoosterSidechain,
      PROVIDER,
    );

    this.symbolOfBestTokenToZapOut = customParams.symbolOfBestTokenToZapOut;
    this.bestTokenAddressToZapOut = customParams.bestTokenAddressToZapOut;
    this.decimalOfBestTokenToZapOut = customParams.decimalOfBestTokenToZapOut;
    this._checkIfParamsAreSet();
  }
  zapInSteps(tokenInAddress) {
    return 3;
  }
  zapOutSteps(tokenInAddress) {
    return 4;
  }
  claimAndSwapSteps() {
    return 3;
  }
  rebalanceSteps() {
    return 2;
  }
  rewards() {
    return [
      {
        symbol: "arb",
        coinmarketcapApiId: 11841,
        address: "0x912ce59144191c1204e64559fe8253a0e49e6548",
        decimals: 18,
      },
      {
        symbol: "oarb",
        coinmarketcapApiId: 11841,
        address: "0x03b611858f8E8913F8DB7d9fDBF59e352b0c83E8",
        decimals: 18,
      },
      {
        symbol: "pendle",
        coinmarketcapApiId: 9481,
        address: "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
        decimals: 18,
      },
      {
        symbol: "eqb",
        coinmarketcapApiId: 26556,
        address: "0xbfbcfe8873fe28dfa25f1099282b088d52bbad9c",
        decimals: 18,
      },
      {
        symbol: "xeqb",
        coinmarketcapApiId: 26556,
        address: "0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E",
        decimals: 18,
      },
    ];
  }
  async pendingRewards(recipient, tokenPricesMappingTable, updateProgress) {
    let rewardBalance = {};
    updateProgress("checking pending rewards");
    const rewardPool = (
      await this.stakeFarmContractInstance.functions.poolInfo(
        this.pidOfEquilibria,
      )
    ).rewardPool;
    const rewardPoolContractInstance = new ethers.Contract(
      rewardPool,
      BaseRewardPool,
      PROVIDER,
    );
    const rewards = (
      await rewardPoolContractInstance.functions.getRewardTokens()
    )[0];
    let pendleAmount;
    for (const reward of rewards) {
      const earnedReward = (
        await rewardPoolContractInstance.functions.earned(recipient, reward)
      )[0];
      const metadata = this._getRewardMetadata(reward);
      rewardBalance[reward] = {
        symbol: metadata.symbol,
        balance: earnedReward,
        usdDenominatedValue:
          (tokenPricesMappingTable[metadata.symbol] * earnedReward) /
          Math.pow(10, metadata.decimals),
        decimals: metadata.decimals,
        vesting: this._checkIfVesting(reward),
      };
      if (reward.toLowerCase() == this.PENDLE_TOKEN_ADDR.toLowerCase()) {
        pendleAmount = earnedReward;
      }
    }
    const eqbMinterAddr = (
      await this.stakeFarmContractInstance.functions.eqbMinter()
    )[0];
    const eqbMinterInstance = new ethers.Contract(
      eqbMinterAddr,
      EqbMinterSidechain,
      PROVIDER,
    );
    const eqbFactor = (await eqbMinterInstance.functions.getFactor())[0];
    const eqbDENOMINATOR = (await eqbMinterInstance.functions.DENOMINATOR())[0];
    const farmEqbShare = (
      await this.stakeFarmContractInstance.functions.farmEqbShare()
    )[0];
    const PENDLE_BOOSTER_DENOMINATOR = (
      await this.stakeFarmContractInstance.functions.DENOMINATOR()
    )[0];
    const sumOfEqbAndXeqb = pendleAmount.mul(eqbFactor).div(eqbDENOMINATOR);
    const eqbAmount = sumOfEqbAndXeqb
      .mul(farmEqbShare)
      .div(PENDLE_BOOSTER_DENOMINATOR);
    const eqbMetadata = this._getRewardMetadata(this.EQB_TOKEN_ADDR);
    rewardBalance[this.EQB_TOKEN_ADDR] = {
      symbol: eqbMetadata.symbol,
      balance: eqbAmount,
      usdDenominatedValue:
        (tokenPricesMappingTable["eqb"] * eqbAmount) /
        Math.pow(10, eqbMetadata.decimals),
      decimals: eqbMetadata.decimals,
    };

    const xeqbAmount = sumOfEqbAndXeqb.sub(eqbAmount);
    const xeqbMetadata = this._getRewardMetadata(this.XEQB_TOKEN_ADDR);
    rewardBalance[this.XEQB_TOKEN_ADDR] = {
      symbol: xeqbMetadata.symbol,
      balance: xeqbAmount,
      usdDenominatedValue:
        (tokenPricesMappingTable["eqb"] * xeqbAmount) /
        Math.pow(10, xeqbMetadata.decimals),
      decimals: xeqbMetadata.decimals,
      vesting: true,
    };
    // TODO: arbitrum incentive
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
    const approveForZapInTxn = approve(
      bestTokenAddressToZapIn,
      this.protocolContract.address,
      amountToZapIn,
      updateProgress,
    );
    updateProgress("fetching Pendle's routing data");
    const resp = await axios.get(
      `https://api-v2.pendle.finance/core/v1/sdk/42161/markets/${this.assetContract.address}/add-liquidity`,
      {
        params: {
          receiver: recipient,
          // slippage from the website is 0.5 (means 0.5%), so we need to divide it by 100 and pass it to Pendle (0.005 = 0.5%)
          slippage: slippage / 100,
          enableAggregator: true,
          tokenIn: bestTokenAddressToZapIn,
          amountIn: amountToZapIn,
          zpi: false,
        },
      },
    );
    updateProgress("prepare equilibria's contract call");
    const slippageBN = ethers.BigNumber.from(
      Math.floor((1 - slippage / 100) * 10000),
    );
    const minLPOutAmount = ethers.BigNumber.from(resp.data.data.amountLpOut)
      .mul(slippageBN)
      .div(10000);
    const mintTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "addLiquiditySingleToken",
      params: resp.data.contractCallParams,
    });
    const approveTxn = approve(
      this.assetContract.address,
      this.stakeFarmContract.address,
      minLPOutAmount,
      updateProgress,
    );

    updateProgress("prepare staking farm's contract call");
    const stakeTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "deposit",
      params: [this.pidOfEquilibria, minLPOutAmount, true],
    });
    return [approveForZapInTxn, mintTxn, approveTxn, stakeTxn];
  }
  async customWithdrawAndClaim(
    recipient,
    percentage,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    // Assuming 'percentage' is a float between 0 and 1
    const percentageBN = ethers.BigNumber.from(Math.floor(percentage * 10000));
    const stakedAmount = await this.stakeBalanceOf(recipient);
    const withdrawAmount = stakedAmount.mul(percentageBN).div(10000);
    const approveEqbLPTxn = approve(
      (
        await this.stakeFarmContractInstance.functions.poolInfo(
          this.pidOfEquilibria,
        )
      ).token,
      this.eqbStakeFarmWithdrawContract.address,
      withdrawAmount,
      updateProgress,
    );

    const withdrawTxn = prepareContractCall({
      contract: this.eqbStakeFarmWithdrawContract,
      method: "withdraw",
      params: [this.pidOfEquilibria, withdrawAmount],
    });
    const approvePendleTxn = approve(
      this.assetContract.address,
      this.protocolContract.address,
      withdrawAmount,
      updateProgress,
    );
    const [
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
    ] = this._getTheBestTokenAddressToZapOut();
    updateProgress("fetching Pendle's routing data");
    const zapOutResp = await axios.get(
      `https://api-v2.pendle.finance/core/v1/sdk/42161/markets/${this.assetContract.address}/remove-liquidity`,
      {
        params: {
          receiver: recipient,
          // slippage from the website is 0.5 (means 0.5%), so we need to divide it by 100 and pass it to Pendle (0.005 = 0.5%)
          slippage: slippage / 100,
          enableAggregator: true,
          tokenOut: bestTokenAddressToZapOut,
          amountIn: withdrawAmount,
        },
      },
    );
    updateProgress("prepare equilibria's contract call");
    const burnTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "removeLiquiditySingleToken",
      params: zapOutResp.data.contractCallParams,
    });
    return [
      [approveEqbLPTxn, withdrawTxn, approvePendleTxn, burnTxn],
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
      zapOutResp.data.contractCallParams[3].minTokenOut,
    ];
  }
  async customClaim(recipient, tokenPricesMappingTable, updateProgress) {
    const pendingRewards = await this.pendingRewards(
      recipient,
      tokenPricesMappingTable,
      updateProgress,
    );
    const claimTxn = prepareContractCall({
      contract: this.eqbStakeFarmWithdrawContract,
      method: "claimRewards",
      params: [[this.pidOfEquilibria]],
    });
    const redeemTxn = this.customRedeemVestingRewards(pendingRewards);
    return [[claimTxn, redeemTxn], pendingRewards];
  }
  async usdBalanceOf(recipient, tokenPricesMappingTable) {
    const userBalance = await this.stakeBalanceOf(recipient);
    const latestPendleAssetPrice = await this._fetchPendleAssetPrice(() => {});
    return (
      (userBalance / Math.pow(10, this.assetDecimals)) * latestPendleAssetPrice
    );
  }
  async stakeBalanceOf(recipient) {
    const rewardPool = (
      await this.stakeFarmContractInstance.functions.poolInfo(
        this.pidOfEquilibria,
      )
    ).rewardPool;
    const eqbPendleLPInstance = new ethers.Contract(
      rewardPool,
      ERC20_ABI,
      PROVIDER,
    );
    return (await eqbPendleLPInstance.functions.balanceOf(recipient))[0];
  }

  async _fetchPendleAssetPrice(updateProgress) {
    updateProgress("fetching Pendle's asset price");
    const resp = await axios.get(
      "https://api-v2.pendle.finance/core/v1/42161/prices/assets/addresses",
      {
        params: {
          addresses: this.assetContract.address,
        },
      },
    );
    return resp.data.pricesUsd[0];
  }
  _getTheBestTokenAddressToZapIn(inputToken, InputTokenDecimals) {
    return [inputToken, InputTokenDecimals];
  }
  _getTheBestTokenAddressToZapOut() {
    // TODO: minor, but we can read the composition of VLP to get the cheapest token to zap in
    return [
      this.symbolOfBestTokenToZapOut,
      this.bestTokenAddressToZapOut,
      this.decimalOfBestTokenToZapOut,
    ];
  }
  _getRewardMetadata(address) {
    for (const rewardMetadata of this.rewards()) {
      if (rewardMetadata.address.toLowerCase() === address.toLowerCase()) {
        return rewardMetadata;
      }
    }
    throw new Error(`Unknown reward ${address}`);
  }
  _checkIfVesting(reward) {
    return [
      this.OARB_TOKEN_ADDR.toLowerCase(),
      this.XEQB_TOKEN_ADDR.toLowerCase(),
    ].includes(reward.toLowerCase());
  }
  customRedeemVestingRewards(pendingRewards) {
    const maxRedeemDuration = 14515200;
    const redeemTxn = prepareContractCall({
      contract: this.xEqbContract,
      method: "redeem",
      params: [pendingRewards[this.XEQB_TOKEN_ADDR].balance, maxRedeemDuration],
    });
    return [redeemTxn];
  }
}
