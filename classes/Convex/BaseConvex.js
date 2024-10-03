import CurveStableSwapNG from "../../lib/contracts/Curve/CurveStableSwapNG.json" assert { type: "json" };
import Booster from "../../lib/contracts/Convex/Booster.json" assert { type: "json" };
import { arbitrum } from "thirdweb/chains";
import axios from "axios";
import { ethers } from "ethers";
import { PROVIDER } from "../../utils/general.js";
import axiosRetry from "axios-retry";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import BaseProtocol from "../BaseProtocol.js";
import { approve } from "../../utils/general";
import { type } from "os";

axiosRetry(axios, { retryDelay: axiosRetry.exponentialDelay });
export class BaseConvex extends BaseProtocol {
  constructor(chain, chaindId, symbolList, mode, customParams) {
    super(chain, chaindId, symbolList, mode, customParams);
    this.protocolName = "convex";
    this.protocolVersion = "0";
    this.pid = 34;
    this.assetDecimals = 18;
    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0x096A8865367686290639bc50bF8D85C0110d9Fea",
      chain: arbitrum,
      abi: CurveStableSwapNG,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0x096A8865367686290639bc50bF8D85C0110d9Fea",
      chain: arbitrum,
      abi: CurveStableSwapNG,
    });
    // stakeFarmContract is null not used in this protocol
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
      chain: arbitrum,
      abi: Booster,
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
    return [];
  }
  async pendingRewards(recipient, tokenPricesMappingTable, updateProgress) {
    return {};
  }
  async customDepositLP(
    recipient,
    tokenAmetadata,
    tokenBmetadata,
    tokenPricesMappingTable,
    slippage,
    updateProgress,
  ) {
    let approveTxns = [];
    let _amounts = [];
    let _min_mint_amount = ethers.BigNumber.from(0);
    for (const [
      bestTokenSymbol,
      bestTokenAddressToZapIn,
      bestTokenToZapInDecimal,
      amountToZapIn,
    ] of [tokenAmetadata, tokenBmetadata]) {
      const approveForZapInTxn = approve(
        bestTokenAddressToZapIn,
        this.protocolContract.address,
        amountToZapIn,
        updateProgress,
      );
      approveTxns.push(approveForZapInTxn);
      _amounts.push(amountToZapIn);
      _min_mint_amount = _min_mint_amount.add(amountToZapIn);
    }
    _min_mint_amount = Math.floor(
      (_min_mint_amount * (100 - slippage)) / 100 / this._calculateLpPrice(),
    );
    const depositTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "add_liquidity",
      params: [_amounts, _min_mint_amount],
    });
    const approveForStakingTxn = approve(
      this.assetContract.address,
      this.stakeFarmContract.address,
      // use 1.1 to make sure we have approved enough, and depositAll of Convex will use the exact amount
      Math.floor(_min_mint_amount * 1.1),
      updateProgress,
    );
    const stakeTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "depositAll",
      params: [this.pid],
    });
    return [approveTxns, depositTxn, approveForStakingTxn, stakeTxn];
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
      YearnV3,
      PROVIDER,
    );
    // Assuming 'percentage' is a float between 0 and 1
    const percentageBN = ethers.BigNumber.from(Math.floor(percentage * 10000));

    const balance = (
      await stakeFarmContractInstance.functions.userInfo(this.pid, recipient)
    )[0];
    const amount = balance.mul(percentageBN).div(10000);
    const unstakeTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "withdraw",
      params: [this.pid, amount],
    });
    const withdrawTxn = prepareContractCall({
      contract: this.assetContract,
      method: "withdraw",
      params: [amount],
    });

    const [
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
    ] = this._getTheBestTokenAddressToZapOut();
    return [
      [unstakeTxn, withdrawTxn],
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
      amount,
    ];
  }
  async customClaim(recipient, tokenPricesMappingTable, updateProgress) {
    return [[], {}];
  }
  customRedeemVestingRewards(pendingRewards) {
    return [];
  }
  async usdBalanceOf(recipient, tokenPricesMappingTable) {
    const assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      CurveStableSwapNG,
      PROVIDER,
    );
    const userBalance =
      await assetContractInstance.functions.balanceOf(recipient);
    return (userBalance * tokenPricesMappingTable["usdc"]) / 1e6;
  }
  async assetBalanceOf(recipient) {
    const assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      CurveStableSwapNG,
      PROVIDER,
    );
    return (await assetContractInstance.functions.balanceOf(recipient))[0];
  }

  _getLPTokenPairesToZapIn() {
    return [
      ["usde", "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34", 18],
      ["susd", "0xb2f30a7c980f052f02563fb518dcc39e6bf38175", 18],
    ];
  }
  _calculateTokenAmountsForLP(tokenMetadatas) {
    return [1, 1];
  }
  _calculateLpPrice() {
    // TODO(david): Implement this
    return 1;
  }
}
