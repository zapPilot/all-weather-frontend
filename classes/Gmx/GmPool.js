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
    this.SYNTHETICS_ROUTER = "0x7452c558d45f8afc8c83dae62c3f8a5be19c71f6"

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
    this.symbolOfBestTokenToZapOut = customParams.symbolOfBestTokenToZapOut;
    this.zapInOutTokenAddress = customParams.zapInOutTokenAddress;
    this.zapInOutTokenDecimals = customParams.zapInOutTokenDecimals;
    this._checkIfParamsAreSet();
    this._initGmxSdk();
  }

  async _initGmxSdk() {
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
    return sdk;
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
    zapInOutTokenAddress,
    amountToZapIn,
    zapInOutTokenDecimals,
    tokenPricesMappingTable,
    slippage,
    updateProgress,
  ) {
    try {
      await this._updateProgressAndWait(
        updateProgress,
        `${this.uniqueId()}-deposit`,
        0,
      );
      const approveTxn = approve(
        zapInOutTokenAddress,
        this.SYNTHETICS_ROUTER,
        amountToZapIn,
        updateProgress,
        this.chainId,
      );

      const executionFee = await this.getExecutionFee();
      const gmTokenPrice = await this.getGmTokenPrice();
      const usdAmount = amountToZapIn / 1000;
      const expectedGmTokens = usdAmount / gmTokenPrice;
      const minMarketTokensInWei = ethers.utils.parseUnits(
        expectedGmTokens.toString(),
        this.assetDecimals
      );

      const depositVault = "0xf89e77e8dc11691c9e8757e84aafbcd8a67d7a55";
      const sendWntTxn = prepareContractCall({
        contract: this.protocolContract,
        method: "sendWnt",
        params: [depositVault, executionFee.toString()],
      });

      const sendTokensTxn = prepareContractCall({
        contract: this.protocolContract,
        method: "sendTokens",
        params: [
          this.zapInOutTokenAddress,
          depositVault,
          amountToZapIn,],
      });

      const depositParams = {
        receiver: owner,
        callbackContract: "0x0000000000000000000000000000000000000000",
        uiFeeReceiver: "0xff00000000000000000000000000000000000001",
        market: this.assetAddress,
        initialLongToken: zapInOutTokenAddress,
        initialShortToken: zapInOutTokenAddress,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
        minMarketTokens: minMarketTokensInWei.toString(),
        shouldUnwrapNativeToken: false,
        executionFee: executionFee.toString(),
        callbackGasLimit: "0"
      };

      const depositTxn = prepareContractCall({
        contract: this.protocolContract,
        method: "createDeposit",
        params: [depositParams],
        value: executionFee
      });

      return [approveTxn,sendWntTxn, sendTokensTxn, depositTxn];
    } catch (error) {
      console.error("Error in customDeposit:", error);
      if (error.message.includes("Paymaster error")) {
        console.error("Paymaster error details:", {
          contract: this.protocolContract.address,
          method: "createDeposit",
          params: depositParams,
          value: executionFee
        });
      }
      throw error;
    }
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
      const tokenPrice = this.assetUsdPrice();
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
    const sdk = await this._initGmxSdk();
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
    return price;
  }

  async getExecutionFee() {
    const sdk = await this._initGmxSdk();
    const gasPrice = await sdk.utils.getGasPrice();
    const gasLimits = await sdk.utils.getGasLimits();
    const baseGasFee = gasLimits.depositToken;
    const baseExecutionFee = baseGasFee * gasPrice;
    const executionFeeWithBuffer = baseExecutionFee * 130n / 100n;
    return executionFeeWithBuffer;
  }

  async stakeBalanceOf(owner) {
    return ethers.BigNumber.from(0);
  }

  _getTheBestTokenAddressToZapIn(inputToken, tokenAddress, InputTokenDecimals) {
    return [this.symbolOfBestTokenToZapOut, this.zapInOutTokenAddress, this.zapInOutTokenDecimals];
  }

  _getTheBestTokenAddressToZapOut() {
    return [
      this.symbolOfBestTokenToZapOut,
      this.zapInOutTokenAddress,
      this.zapInOutTokenDecimals,
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
