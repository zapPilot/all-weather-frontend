import CurveStableSwapNG from "../../lib/contracts/Curve/CurveStableSwapNG.json" assert { type: "json" };
import Booster from "../../lib/contracts/Convex/Booster.json" assert { type: "json" };
import ConvexRewardPool from "../../lib/contracts/Convex/ConvexRewardPool.json" assert { type: "json" };
import { CHAIN_ID_TO_CHAIN } from "../../utils/general";

import axios from "axios";
import { ethers } from "ethers";
import { PROVIDER } from "../../utils/general.js";
import axiosRetry from "axios-retry";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import BaseProtocol from "../BaseProtocol.js";
import { approve } from "../../utils/general";
import ERC20_ABI from "../../lib/contracts/ERC20.json" assert { type: "json" };

axiosRetry(axios, { retryDelay: axiosRetry.exponentialDelay });
export class BaseConvex extends BaseProtocol {
  constructor(chain, chaindId, symbolList, mode, customParams) {
    super(chain, chaindId, symbolList, mode, customParams);
    this.protocolName = "convex";
    this.protocolVersion = "0";
    this.pid = this.customParams.pid;
    this.assetDecimals = this.customParams.assetDecimals;
    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: this.customParams.assetAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: CurveStableSwapNG,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: this.customParams.protocolAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: CurveStableSwapNG,
    });
    // stakeFarmContract is null not used in this protocol
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: Booster,
    });
    this.convexRewardPoolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: customParams.convexRewardPool,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: ConvexRewardPool,
    });
    this._checkIfParamsAreSet();
  }
  zapInSteps(tokenInAddress) {
    return 1;
  }
  zapOutSteps(tokenInAddress) {
    return 1;
  }
  claimAndSwapSteps() {
    return 2;
  }
  rewards() {
    return this.customParams.rewards;
  }
  async pendingRewards(owner, tokenPricesMappingTable, updateProgress) {
    let rewardBalance = {};
    updateProgress(
      `fetching pending rewards from ${this.stakeFarmContract.address}`,
    );
    const stakeFarmContractInstance = new ethers.Contract(
      this.convexRewardPoolContract.address,
      ConvexRewardPool,
      PROVIDER(this.chain),
    );
    const rewards = this.rewards();
    for (let index = 0; index < rewards; index++) {
      const reward_address = (
        await stakeFarmContractInstance.functions.rewards(index)
      ).reward_token;
      const reward_balance = (
        await stakeFarmContractInstance.functions.claimable_reward(
          reward_address,
          owner,
        )
      )[0];
      rewardBalance[reward_address] = {
        symbol: rewards[index].symbol,
        balance: reward_balance,
        usdDenominatedValue:
          (tokenPricesMappingTable[rewards[index].symbol] * reward_balance) /
          Math.pow(10, rewards[index].decimals),
        decimals: rewards[index].decimals,
      };
    }
    return rewardBalance;
  }
  async customDepositLP(
    owner,
    tokenAmetadata,
    tokenBmetadata,
    tokenPricesMappingTable,
    slippage,
    updateProgress,
  ) {
    let approveTxns = [];
    let _amounts = [];
    let _min_mint_amount = 0;
    for (const [
      bestTokenSymbol,
      bestTokenAddressToZapIn,
      bestTokenToZapInDecimal,
      amountToZapIn,
    ] of [tokenAmetadata, tokenBmetadata]) {
      const approveForZapInTxn = await this.approve(
        bestTokenAddressToZapIn,
        this.protocolContract.address,
        amountToZapIn,
        updateProgress,
        this.chainId,
      );
      approveTxns.push(approveForZapInTxn);
      _amounts.push(amountToZapIn);
      const normalizedAmount = Number(
        ethers.utils.formatUnits(
          amountToZapIn.toString(),
          bestTokenToZapInDecimal,
        ),
      );
      _min_mint_amount += normalizedAmount;
    }
    _min_mint_amount = ethers.BigNumber.from(
      Math.floor(
        (_min_mint_amount *
          this._calculateLpPrice(tokenPricesMappingTable) *
          (100 - slippage)) /
          100,
      ),
      this.assetDecimals,
    );
    const depositTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "add_liquidity",
      params: [_amounts, _min_mint_amount],
    });
    await this._updateProgressAndWait(updateProgress, `${this.uniqueId()}-deposit`, 1);
    const stakeTxns = await this._stakeLP(_amounts, updateProgress);
    return [...approveTxns, depositTxn, ...stakeTxns];
  }
  async customClaim(owner, tokenPricesMappingTable, updateProgress) {
    const pendingRewards = await this.pendingRewards(
      owner,
      tokenPricesMappingTable,
      updateProgress,
    );
    const claimTxn = prepareContractCall({
      contract: this.convexRewardPoolContract,
      method: "function getReward(address _account)",
      params: [owner],
    });
    return [[claimTxn], pendingRewards];
  }
  async usdBalanceOf(owner, tokenPricesMappingTable) {
    const lpBalance = await this.stakeBalanceOf(owner, () => {});
    const lpPrice = this._calculateLpPrice(tokenPricesMappingTable);
    return lpBalance * lpPrice;
  }
  async assetUsdPrice(tokenPricesMappingTable) {
    return await this._calculateLpPrice(tokenPricesMappingTable);
  }
  async stakeBalanceOf(owner, updateProgress) {
    const rewardPoolContractInstance = new ethers.Contract(
      this.convexRewardPoolContract.address,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    return (await rewardPoolContractInstance.functions.balanceOf(owner))[0];
  }
  _getLPTokenPairesToZapIn() {
    return this.customParams.lpTokens;
  }
  async _calculateTokenAmountsForLP(tokenMetadatas) {
    return [1, 1];
  }
  _calculateLpPrice(tokenPricesMappingTable) {
    // TODO(david): need to calculate the correct LP price
    if (this.pid === 34 || this.pid === 36) {
      // it's a stablecoin pool
      return 1 / Math.pow(10, this.assetDecimals);
    } else if (this.pid === 28) {
      // it's a ETH pool
      return tokenPricesMappingTable["weth"] / Math.pow(10, this.assetDecimals);
    }
    throw new Error("Not implemented");
  }
  async _stakeLP(amount, updateProgress) {
    const approveForStakingTxn = approve(
      this.assetContract.address,
      this.stakeFarmContract.address,
      // TODO(David): not sure why _min_mint_amount cannot be used here
      // here's the failed txn: https://dashboard.tenderly.co/davidtnfsh/project/tx/arbitrum/0x822f5f426de88d1890f8836e825f52a70d22f5bcd8665125a83755eb947a4d88?trace=0.4.0.0.0.0.18.1
      ethers.constants.MaxUint256,
      updateProgress,
      this.chainId,
    );
    const stakeTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "depositAll",
      params: [this.pid],
    });
    return [approveForStakingTxn, stakeTxn];
  }
  async _unstakeLP(owner, percentage, updateProgress) {
    const percentageBN = ethers.BigNumber.from(Math.floor(percentage * 10000));
    const stakeBalance = await this.stakeBalanceOf(owner, updateProgress);
    const amount = stakeBalance.mul(percentageBN).div(10000);
    const unstakeTxn = prepareContractCall({
      contract: this.convexRewardPoolContract,
      method: "withdraw",
      params: [amount, false],
    });
    return [[unstakeTxn], amount];
  }
  async _withdrawLPAndClaim(
    owner,
    amount,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    const protocolContractInstance = new ethers.Contract(
      this.protocolContract.address,
      CurveStableSwapNG,
      PROVIDER(this.chain),
    );
    updateProgress("Getting LP balances");
    const [token_a_balance, token_b_balance] = (
      await protocolContractInstance.functions.get_balances()
    )[0];
    const decimalsA = this.customParams.lpTokens[0][2];
    const decimalsB = this.customParams.lpTokens[1][2];
    const normalizedTokenA = Number(
      ethers.utils.formatUnits(token_a_balance.toString(), decimalsA),
    );
    const normalizedTokenB = Number(
      ethers.utils.formatUnits(token_b_balance.toString(), decimalsB),
    );
    const ratio = normalizedTokenA / (normalizedTokenA + normalizedTokenB);
    const normalizedAmount = ethers.utils.formatUnits(
      amount.toString(),
      this.assetDecimals,
    );
    const minimumWithdrawAmount_a = this.mul_with_slippage_in_bignumber_format(
      ethers.utils.parseUnits(
        (normalizedAmount * ratio).toFixed(decimalsA),
        decimalsA,
      ),
      slippage,
    );
    const minimumWithdrawAmount_b = this.mul_with_slippage_in_bignumber_format(
      ethers.utils.parseUnits(
        (normalizedAmount * (1 - ratio)).toFixed(decimalsB),
        decimalsB,
      ),
      slippage,
    );
    const minPairAmounts = [minimumWithdrawAmount_a, minimumWithdrawAmount_b];
    const withdrawTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "remove_liquidity",
      params: [amount, minPairAmounts],
    });
    const [claimTxns, _] = await this.customClaim(
      owner,
      tokenPricesMappingTable,
      updateProgress,
    );
    const tokenMetadatas = this._getLPTokenPairesToZapIn();
    return [[withdrawTxn, ...claimTxns], tokenMetadatas, minPairAmounts];
  }
  async lockUpPeriod() {
    return 0;
  }
}
