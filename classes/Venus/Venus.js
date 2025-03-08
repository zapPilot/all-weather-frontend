import Vault from "../../lib/contracts/Venus/Vault.json" assert { type: "json" };
import BaseProtocol from "../BaseProtocol";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { CHAIN_ID_TO_CHAIN, PROVIDER, approve } from "../../utils/general";
import { ethers } from "ethers";

export class Venus extends BaseProtocol {
  constructor(chain, chainId, symbolList, mode, customParams) {
    super(chain, chainId, symbolList, mode, customParams);

    this.protocolName = "venus";
    this.protocolVersion = "0";
    this.assetDecimals = customParams.assetDecimals;

    if (!customParams.assetAddress) {
      throw new Error("Asset address is required");
    }

    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: customParams.assetAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: Vault,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: customParams.protocolAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: Vault,
    });
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      address: customParams.protocolAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: Vault,
    });

    this.assetContractInstance = new ethers.Contract(
      customParams.assetAddress,
      Vault,
      PROVIDER(this.chain),
    );
    this.stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      Vault,
      PROVIDER(this.chain),
    );

    this.symbolOfBestTokenToZapInOut = customParams.symbolOfBestTokenToZapInOut;
    this.zapInOutTokenAddress = customParams.zapInOutTokenAddress;
    this._checkIfParamsAreSet();
  }

  rewards() {
    return [];
  }

  async pendingRewards(owner, tokenPricesMappingTable, updateProgress) {
    return {};
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
    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-deposit`,
      0,
    );

    const approveTxn = approve(
      bestTokenAddressToZapIn,
      this.protocolContract.address,
      amountToZapIn,
      updateProgress,
      this.chainId,
    );

    const depositTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "mint",
      params: [amountToZapIn],
    });

    return [approveTxn, depositTxn];
  }

  async customClaim(owner, tokenPricesMappingTable, updateProgress) {
    return [[], {}];
  }

  async usdBalanceOf(owner, tokenPricesMappingTable) {
    try {
      const protocolContractInstance = new ethers.Contract(
        this.protocolContract.address,
        Vault,
        PROVIDER(this.chain),
      );

      const userBalance = await protocolContractInstance.balanceOf(owner);
      const usdcPrice =
        tokenPricesMappingTable[this.symbolOfBestTokenToZapInOut] || 1;
      const exchangeRate = await protocolContractInstance.exchangeRateStored();

      const actualBalance = userBalance
        .mul(exchangeRate)
        .div(ethers.BigNumber.from(10).pow(18));
      const balanceInUSDC = parseFloat(
        ethers.utils.formatUnits(actualBalance, 6),
      );

      return Number(balanceInUSDC * usdcPrice);
    } catch (error) {
      console.error("Error in usdBalanceOf:", error);
      return 0;
    }
  }

  async assetUsdPrice(tokenPricesMappingTable) {
    return await this._fetchVusdPrice(() => {});
  }

  async _fetchVusdPrice(updateProgress) {
    const protocolContractInstance = new ethers.Contract(
      this.protocolContract.address,
      Vault,
      PROVIDER(this.chain),
    );
    const exchangeRate = await protocolContractInstance.exchangeRateStored();
    const vusdPrice = exchangeRate.div(ethers.BigNumber.from(10).pow(18));

    return vusdPrice;
  }
  async stakeBalanceOf(owner) {
    return ethers.BigNumber.from(0);
  }

  _getTheBestTokenAddressToZapIn(inputToken, tokenAddress, InputTokenDecimals) {
    const usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    return ["usdc", usdcAddress, 6];
  }

  _getTheBestTokenAddressToZapOut() {
    const usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    return ["usdc", usdcAddress, 6];
  }

  async lockUpPeriod() {
    return 0;
  }

  async _stake(amount, updateProgress) {
    await super._stake(amount, updateProgress);
    return [];
  }

  async _unstake(owner, percentage, updateProgress) {
    await super._unstake(owner, percentage, updateProgress);
    const percentagePrecision = 18;
    const percentageStr = percentage
      .toFixed(percentagePrecision)
      .replace(".", "");
    const percentageBN = ethers.BigNumber.from(percentageStr);
    const protocolContractInstance = new ethers.Contract(
      this.protocolContract.address,
      Vault,
      PROVIDER(this.chain),
    );
    const assetAmount = await protocolContractInstance.balanceOf(owner);
    const withdrawAmount = assetAmount
      .mul(percentageBN)
      .div(ethers.BigNumber.from("10").pow(percentagePrecision));

    return [[], withdrawAmount];
  }

  async customWithdrawAndClaim(
    recipient,
    percentage,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    try {
      await this._updateProgressAndWait(
        updateProgress,
        `${this.uniqueId()}-withdraw`,
        0,
      );

      const protocolContractInstance = new ethers.Contract(
        this.protocolContract.address,
        Vault,
        PROVIDER(this.chain),
      );

      const balance = await protocolContractInstance.balanceOf(recipient);

      const percentageBN = ethers.utils.parseUnits(percentage.toString(), 18);
      const amountToWithdraw = balance
        .mul(percentageBN)
        .div(ethers.BigNumber.from(10).pow(18));

      const redeemTxn = prepareContractCall({
        contract: this.protocolContract,
        method: "redeem",
        params: [amountToWithdraw],
      });

      const [
        symbolOfBestTokenToZapOut,
        bestTokenAddressToZapOut,
        decimalsOfZapInOutToken,
      ] = this._getTheBestTokenAddressToZapOut();

      return [
        [redeemTxn],
        symbolOfBestTokenToZapOut,
        bestTokenAddressToZapOut,
        decimalsOfZapInOutToken,
        amountToWithdraw,
      ];
    } catch (error) {
      console.error("Error in customWithdrawAndClaim:", error);
      throw error;
    }
  }

  async _withdrawAndClaim(
    owner,
    amount,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    await super._withdrawAndClaim(
      owner,
      amount,
      slippage,
      tokenPricesMappingTable,
      updateProgress,
    );

    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-withdraw`,
      0,
    );

    const [
      symbolOfBestTokenToZapInOut,
      bestTokenAddressToZapOut,
      assetDecimals,
    ] = this._getTheBestTokenAddressToZapOut();

    const protocolContractInstance = new ethers.Contract(
      this.protocolContract.address,
      Vault,
      PROVIDER(this.chain),
    );

    const balance = await protocolContractInstance.balanceOf(recipient);
    const percentageBN = ethers.utils.parseUnits(percentage.toString(), 18);
    const amountToWithdraw = balance
      .mul(percentageBN)
      .div(ethers.BigNumber.from(10).pow(18));
    const burnTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "redeem",
      params: [amountToWithdraw],
    });

    return [
      [burnTxn],
      symbolOfBestTokenToZapInOut,
      bestTokenAddressToZapOut,
      assetDecimals,
      amountToWithdraw,
    ];
  }
}
