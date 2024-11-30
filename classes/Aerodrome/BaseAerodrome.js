import Router from "../../lib/contracts/Aerodrome/Router.json" assert { type: "json" };
import Guage from "../../lib/contracts/Aerodrome/Guage.json" assert { type: "json" };
import Pool from "../../lib/contracts/Aerodrome/Pool.json" assert { type: "json" };
import axios from "axios";
import { ethers } from "ethers";
import { PROVIDER } from "../../utils/general.js";
import axiosRetry from "axios-retry";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import BaseProtocol from "../BaseProtocol.js";
import { approve, CHAIN_ID_TO_CHAIN } from "../../utils/general";
import ERC20_ABI from "../../lib/contracts/ERC20.json" assert { type: "json" };

axiosRetry(axios, { retryDelay: axiosRetry.exponentialDelay });
export class BaseAerodrome extends BaseProtocol {
  constructor(chain, chaindId, symbolList, mode, customParams) {
    super(chain, chaindId, symbolList, mode, customParams);
    this.protocolName = "aerodrome";
    this.protocolVersion = "0";
    this.assetDecimals = this.customParams.assetDecimals;
    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: this.customParams.assetAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: Pool,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: Router,
    });
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xDBF852464fC906C744E52Dbd68C1b07dD33A922a",
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: Guage,
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
    const rewardLength =
      await stakeFarmContractInstance.functions.rewardLength();
    const rewards = this.rewards();
    for (let index = 0; index < rewardLength; index++) {
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
    // Prepare token amounts and approvals
    const tokens = [tokenAmetadata, tokenBmetadata].map(
      ([symbol, address, decimals, amount]) => ({
        address,
        amount,
        minAmount: this.mul_with_slippage_in_bignumber_format(
          amount,
          slippage * 10,
        ),
        decimals,
      }),
    );
    const min_mint_amount = this._calculateMintLP(tokens[0], tokens[1]);

    // Generate approve transactions
    const approveTxns = tokens.map((token) =>
      approve(
        token.address,
        this.protocolContract.address,
        token.amount,
        updateProgress,
        this.chainId,
      ),
    );

    const depositTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "addLiquidity",
      params: [
        tokens[0].address,
        tokens[1].address,
        true,
        tokens[0].amount,
        tokens[1].amount,
        tokens[0].minAmount,
        tokens[1].minAmount,
        owner,
        Math.floor(Date.now() / 1000) + 600, // 10 minute deadline
      ],
    });

    // Get staking transactions and combine all transactions
    const stakeTxns = await this._stakeLP(min_mint_amount, updateProgress);
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
    return (lpBalance * lpPrice) / Math.pow(10, this.assetDecimals);
  }
  async assetUsdPrice() {
    return await this._calculateLpPrice(() => {});
  }
  async stakeBalanceOf(owner, updateProgress) {
    const rewardPoolContractInstance = new ethers.Contract(
      this.convexRewardPoolContract.address,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    updateProgress("Getting stake balance");
    return (await rewardPoolContractInstance.functions.balanceOf(owner))[0];
  }
  _getLPTokenPairesToZapIn() {
    return this.customParams.lpTokens;
  }
  _calculateTokenAmountsForLP(tokenMetadatas) {
    return [1, 1];
  }
  _calculateMintLP(tokenAmetadata, tokenBmetadata) {
    // Convert amounts to common decimals and calculate average
    const amountA = Number(
      ethers.utils.formatUnits(
        tokenAmetadata.minAmount.toString(),
        tokenAmetadata.decimals,
      ),
    );
    const amountB = Number(
      ethers.utils.formatUnits(
        tokenBmetadata.minAmount.toString(),
        tokenBmetadata.decimals,
      ),
    );

    // Calculate expected LP tokens (average of normalized amounts)
    const averageAmount = ((amountA + amountB) / 2).toFixed(this.assetDecimals);

    // Convert to BigNumber with proper scaling
    return ethers.BigNumber.from(
      String(averageAmount * Math.pow(10, this.assetDecimals)),
    ).div(ethers.BigNumber.from(10).pow(6));
  }
  _calculateLpPrice(tokenPricesMappingTable) {
    // TODO(david): need to calculate the correct LP price
    if (this.pid === 34) {
      // it's a stablecoin pool
      return 1;
    } else if (this.pid === 28) {
      // it's a ETH pool
      return tokenPricesMappingTable["weth"];
    }
    throw new Error("Not implemented");
  }
  async _stakeLP(amount, updateProgress) {
    const approveForStakingTxn = approve(
      this.assetContract.address,
      this.stakeFarmContract.address,
      amount,
      updateProgress,
      this.chainId,
    );
    const stakeTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "function deposit(uint256 _amount)",
      params: [amount],
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
    const ratio = token_a_balance
      .mul(ethers.constants.WeiPerEther)
      .div(token_a_balance.add(token_b_balance));
    const minimumWithdrawAmount_a = this.mul_with_slippage_in_bignumber_format(
      amount.mul(ratio).div(ethers.constants.WeiPerEther),
      slippage,
    );
    const minimumWithdrawAmount_b = this.mul_with_slippage_in_bignumber_format(
      amount
        .mul(ethers.constants.WeiPerEther.sub(ratio))
        .div(ethers.constants.WeiPerEther),
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
