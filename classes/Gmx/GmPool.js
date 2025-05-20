import GmPoolAbi from "../../lib/contracts/Gmx/GmPool.json" assert { type: "json" };
import GmTokenAbi from "../../lib/contracts/Gmx/GmToken.json" assert { type: "json" };
import BaseProtocol from "../BaseProtocol";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { CHAIN_ID_TO_CHAIN, PROVIDER, approve } from "../../utils/general";
import { ethers } from "ethers";
import axios from "axios";

// GMX V2 Contract Addresses
// Source: https://github.com/gmx-io/gmx-synthetics/blob/main/deployments/arbitrum
const GMX_V2_CONTRACTS = {
  DATASTORE: "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
  SYNTHETICS_ROUTER: "0x7452c558d45f8afc8c83dae62c3f8a5be19c71f6",
  DEPOSIT_VAULT: "0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55"
};

export class GmPool extends BaseProtocol {
  constructor(chain, chainId, symbolList, mode, customParams) {
    super(chain, chainId, symbolList, mode, customParams);
    this.protocolName = "gmx";
    this.protocolVersion = "0";
    this.assetDecimals = customParams.assetDecimals;
    this.assetAddress = customParams.assetAddress;
    this.SYNTHETICS_ROUTER = GMX_V2_CONTRACTS.SYNTHETICS_ROUTER;

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
      console.log("amountToZapIn", amountToZapIn);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/gmx/deposit/gm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_api_key: "placeholder",
            chain: "arbitrum",
            amount: amountToZapIn.toString(),
            token_address: this.zapInOutTokenAddress.toLowerCase(),
            user_address: owner,
            market_key: this.assetAddress.toLowerCase(),
            initial_long_token: this.zapInOutTokenAddress.toLowerCase(),
            initial_short_token: this.zapInOutTokenAddress.toLowerCase(),
            long_token_amount: amountToZapIn.toString(),
            short_token_amount: amountToZapIn.toString(),
            debug_mode: true
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData,
        });
        throw new Error(`API call failed: ${response.statusText}`);
      }

      console.log('API Response:', response);

      const result = await response.json();
      console.log('API Result:', result);
      console.log("result.data", result.data)

      // 準備 approve 交易
      const approveTxn = prepareContractCall({
        contract: this.assetContract,
        method: "approve",
        params: [
          this.SYNTHETICS_ROUTER,
          amountToZapIn
        ]
      });

      // 將 API 返回的資料轉換成 thirdweb 的 prepareContractCall 格式
      const depositTxn = prepareContractCall({
        contract: this.protocolContract,
        method: "multicall",
        params: [result.data.multicall_args],
        value: result.data.execution_fee
      });

      return [approveTxn, depositTxn];

    } catch (error) {
      console.error("Error in customDeposit:", error);
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
