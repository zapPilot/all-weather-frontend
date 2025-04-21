import GmPoolAbi from "../../lib/contracts/Gmx/GmPool.json" assert { type: "json" };
import GmTokenAbi from "../../lib/contracts/Gmx/GmToken.json" assert { type: "json" };
import BaseProtocol from "../BaseProtocol";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { CHAIN_ID_TO_CHAIN, PROVIDER, approve } from "../../utils/general";
import { ethers } from "ethers";

export class GmPool extends BaseProtocol {
  constructor(chain, chainId, symbolList, mode, customParams) {
    super(chain, chainId, symbolList, mode, customParams);
    this.protocolName = "gmx";
    this.protocolVersion = "0";
    this.assetDecimals = customParams.assetDecimals;
    this.assetAddress = customParams.assetAddress;

    if (!customParams.assetAddress) {
      throw new Error("Asset address is required");
    }

    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: customParams.assetAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: GmTokenAbi,
    });
    
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: customParams.protocolAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: GmPoolAbi,
    });

    this.stakeFarmContract = this.protocolContract;

    this.assetContractInstance = new ethers.Contract(
      customParams.assetAddress,
      GmPoolAbi,
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
      method: "multicall",
      params: [amountToZapIn],
    });

    return [approveTxn, depositTxn];
  }

  async customClaim(owner, tokenPricesMappingTable, updateProgress) {
    return [[], {}];
  }

  async usdBalanceOf(owner) {
    try {
      const gmTokenContractInstance = new ethers.Contract(
        this.assetContract.address,
        GmTokenAbi,
        PROVIDER(this.chain)
      );
      const userBalance = await gmTokenContractInstance.balanceOf(owner);
      const balanceFormatted = ethers.utils.formatUnits(userBalance, this.assetDecimals);
      const tokenPrice = await this.getGmTokenPrice();
      const totalValue = Number(balanceFormatted) * tokenPrice;
      return totalValue;
    } catch (error) {
      console.error("Error in usdBalanceOf:", error);
      return 0;
    }
  }

  async assetUsdPrice(tokenPricesMappingTable) {
    return await this.getGmTokenPrice(() => {});
  }

  async getGmTokenPrice() {
    const { GmxSdk } = await import("@gmx-io/sdk");
    const sdk = new GmxSdk({
      chainId: 42161,
      oracleUrl: "https://arbitrum-api.gmxinfra.io",
      rpcUrl: "https://arb1.arbitrum.io/rpc",
      subgraph: {
        subsquid:
          "https://gmx.squids.live/gmx-synthetics-arbitrum:live/api/graphql",
      },
    });
    const gmTokenContractInstance = new ethers.Contract(
      this.assetContract.address,
      GmTokenAbi,
      PROVIDER(this.chain),
    );
    const { marketsInfoData } = await sdk.markets.getMarketsInfo();
    const marketInfo = marketsInfoData[this.assetAddress];
    if (!marketInfo) return 0;
    const totalSupply = await gmTokenContractInstance.totalSupply();
    const price = Number(ethers.utils.formatUnits(marketInfo.poolValueMax, 30)) / Number(ethers.utils.formatUnits(totalSupply, this.assetDecimals));
    console.log(price);
    return price;
  }

  async stakeBalanceOf(owner) {
    return ethers.BigNumber.from(0);
  }

  _getTheBestTokenAddressToZapIn(inputToken, tokenAddress, InputTokenDecimals) {
    return [inputToken, this.zapInOutTokenAddress, this.zapInOutTokenDecimals];
  }

  _getTheBestTokenAddressToZapOut() {
    return [
      this.symbolOfBestTokenToZapInOut,
      this.zapInOutTokenAddress,
      this.assetDecimals,
    ];
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
    const percentageStr = percentage
      .toFixed(this.percentagePrecision)
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
      .div(ethers.BigNumber.from("10").pow(this.percentagePrecision));

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
      const percentageBN = ethers.utils.parseUnits(
        percentage.toString(),
        this.percentagePrecision,
      );
      const amountToWithdraw = balance
        .mul(percentageBN)
        .div(ethers.BigNumber.from(10).pow(this.percentagePrecision));

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

    const balance = await protocolContractInstance.balanceOf(owner);
    const percentageBN = ethers.utils.parseUnits(
      percentage.toString(),
      this.percentagePrecision,
    );
    const amountToWithdraw = balance
      .mul(percentageBN)
      .div(ethers.BigNumber.from(10).pow(this.percentagePrecision));
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
