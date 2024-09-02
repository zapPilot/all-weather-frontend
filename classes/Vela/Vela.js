import Vault from "../../lib/contracts/Vela/Vault.json" assert { type: "json" };
import TokenFarm from "../../lib/contracts/Vela/TokenFarm.json" assert { type: "json" };
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

axiosRetry(axios, { retryDelay: axiosRetry.exponentialDelay });
export class Vela extends BaseProtocol {
  constructor(chain, chaindId, symbolList, mode, customParams) {
    super(chain, chaindId, symbolList, mode, customParams);
    // arbitrum's Apollox is staked on PancakeSwap
    this.protocolName = "vela";
    this.protocolVersion = "0";
    this.assetDecimals = 18;
    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xC5b2D9FDa8A82E8DcECD5e9e6e99b78a9188eB05",
      chain: arbitrum,
      abi: ERC20_ABI,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0xC4ABADE3a15064F9E3596943c699032748b13352",
      chain: arbitrum,
      abi: Vault,
    });
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      address: "0x60b8C145235A31f1949a831803768bF37d7Ab7AA",
      chain: arbitrum,
      abi: TokenFarm,
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
      rewards: [],
    };
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
    const latestPrice = await this._fetchVlpPrice(updateProgress);
    // on Arbitrum, we don't stake and then put VLP to pancakeswap for higher APY
    const estimatedVlpAmount =
      ((tokenPricesMappingTable[inputToken] * amountToZapIn) /
        Math.pow(10, bestTokenToZapInDecimal) /
        latestPrice) *
      Math.pow(10, this.assetDecimals);
    const minVlpAmount = Math.floor(
      (estimatedVlpAmount * (100 - slippage)) / 100,
    );
    const mintTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "stake",
      params: [recipient, bestTokenAddressToZapIn, amountToZapIn],
    });
    const approveAlpTxn = approve(
      this.assetContract.address,
      this.stakeFarmContract.address,
      minVlpAmount,
      updateProgress,
    );
    const stakeTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "stake", // <- this gets inferred from the contract
      params: [this.assetContract.address, minVlpAmount],
    });
    return [mintTxn, approveAlpTxn, stakeTxn];
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
      TokenFarm,
      PROVIDER,
    );
    const vlpAmount = Math.floor(
      (
        await stakeFarmContractInstance.functions.getStakedAmount(
          this.assetContract.address,
          recipient,
        )
      )[0] * percentage,
    );
    console.log(
      "vlpAmount",
      vlpAmount,
      await stakeFarmContractInstance.functions.getStakedAmount(
        this.assetContract.address,
        recipient,
      )[0],
    );
    const approveAlpTxn = approve(
      this.assetContract.address,
      this.protocolContract.address,
      vlpAmount,
      updateProgress,
    );

    const withdrawTxn = prepareContractCall({
      contract: this.stakeFarmContract,
      method: "unstake",
      params: [this.assetContract.address, vlpAmount],
    });

    const [
      symbolOfBestTokenToZapOut,
      bestTokenAddressToZapOut,
      decimalOfBestTokenToZapOut,
    ] = this._getTheBestTokenAddressToZapOut();
    const latestPrice = await this._fetchVlpPrice(updateProgress);

    const minOutAmount = Math.floor(
      ((((vlpAmount / Math.pow(10, this.assetDecimals)) * latestPrice) /
        tokenPricesMappingTable[symbolOfBestTokenToZapOut]) *
        Math.pow(10, decimalOfBestTokenToZapOut) *
        (100 - slippage)) /
        100,
    );

    const burnTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "unstake",
      params: [bestTokenAddressToZapOut, vlpAmount],
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
    return [[], {}];
  }
  async usdBalanceOf(recipient) {
    const stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      TokenFarm,
      PROVIDER,
    );
    const userBalance = (
      await stakeFarmContractInstance.functions.getStakedAmount(
        this.assetContract.address,
        recipient,
      )
    )[0];
    const latestVlpPrice = await this._fetchVlpPrice(() => {});
    return (userBalance / Math.pow(10, this.assetDecimals)) * latestVlpPrice;
  }

  async _fetchVlpPrice(updateProgress) {
    const protocolContractInstance = new ethers.Contract(
      this.protocolContract.address,
      Vault,
      PROVIDER,
    );
    const vlpPrice =
      (await protocolContractInstance.functions.getVLPPrice()) / 1e5;
    updateProgress("fetching VLP price");
    return vlpPrice;
  }
  _getTheBestTokenAddressToZapIn() {
    // TODO: minor, but we can read the composition of VLP to get the cheapest token to zap in
    const usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    return [usdcAddress, 6];
  }
  _getTheBestTokenAddressToZapOut() {
    // TODO: minor, but we can read the composition of VLP to get the cheapest token to zap in
    const usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    return ["usdc", usdcAddress, 6];
  }
}
