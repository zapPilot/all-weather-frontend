import YearnV3 from "../../lib/contracts/Yearn/YearnV3.json" assert { type: "json" };
import ERC20_ABI from "../../lib/contracts/ERC20.json" assert { type: "json" };
import { arbitrum } from "thirdweb/chains";
import axios from "axios";
import { ethers } from "ethers";
import { PROVIDER } from "../../utils/general.js";
import axiosRetry from "axios-retry";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import BaseProtocol from "../BaseProtocol.js";
import { approve } from "../../utils/general";

axiosRetry(axios, { retryDelay: axiosRetry.exponentialDelay });
export class YearnV3Vault extends BaseProtocol {
  constructor(chain, chaindId, symbolList, mode, customParams) {
    super(chain, chaindId, symbolList, mode, customParams);
    this.protocolName = "yearn";
    this.protocolVersion = "0";
    this.assetDecimals = 18;
    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0x86dF48f8DC91504D2B3E360d67513f094Dfa6C84",
      chain: arbitrum,
      abi: YearnV3,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0x86dF48f8DC91504D2B3E360d67513f094Dfa6C84",
      chain: arbitrum,
      abi: YearnV3,
    });
    // stakeFarmContract is null not used in this protocol
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0x86dF48f8DC91504D2B3E360d67513f094Dfa6C84",
      chain: arbitrum,
      abi: YearnV3,
    });
    this._checkIfParamsAreSet();
  }
  zapInSteps(tokenInAddress) {
    return 2;
  }
  zapOutSteps(tokenInAddress) {
    return 2;
  }
  claimAndSwapSteps() {
    return 4;
  }
  rewards() {
    return [];
  }
  async pendingRewards(recipient, tokenPricesMappingTable, updateProgress) {
    return {};
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

    updateProgress("deposit");
    const depositTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "deposit",
      params: [amountToZapIn, recipient],
    });
    return [approveForZapInTxn, depositTxn];
  }
  async customWithdrawAndClaim(
    recipient,
    percentage,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    const assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      YearnV3,
      PROVIDER,
    );
    // Assuming 'percentage' is a float between 0 and 1
    const percentageBN = ethers.BigNumber.from(Math.floor(percentage * 10000));

    const balance = (
      await assetContractInstance.functions.balanceOf(recipient)
    )[0];
    const amount = balance.mul(percentageBN).div(10000);
    const withdrawTxn = prepareContractCall({
      contract: this.assetContract,
      method: "withdraw",
      params: [amount, recipient, recipient],
    });
    const [
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
    ] = this._getTheBestTokenAddressToZapOut();

    return [
      [withdrawTxn],
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
      amount,
    ];
  }
  async customClaim(recipient, tokenPricesMappingTable, updateProgress) {
    return [[], {}];
  }
  async usdBalanceOf(recipient, tokenPricesMappingTable) {
    const assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      YearnV3,
      PROVIDER,
    );
    const userBalance =
      await assetContractInstance.functions.balanceOf(recipient);
    const pricePerShare = await assetContractInstance.functions.pricePerShare();
    return (
      (((userBalance * tokenPricesMappingTable["weth"]) / 1e18) *
        pricePerShare) /
      1e18
    );
  }
  async assetBalanceOf(recipient) {
    const assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      Vault,
      PROVIDER,
    );
    return (await assetContractInstance.functions.balanceOf(recipient))[0];
  }

  _getTheBestTokenAddressToZapIn(inputToken, InputTokenDecimals) {
    // TODO: minor, but we can read the composition of VLP to get the cheapest token to zap in
    const weth = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
    return [weth, 18];
  }
  _getTheBestTokenAddressToZapOut() {
    // TODO: minor, but we can read the composition of VLP to get the cheapest token to zap in
    const weth = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
    return ["weth", weth, 18];
  }
}
