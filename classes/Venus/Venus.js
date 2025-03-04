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
      PROVIDER(this.chain)
    );
    this.stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      Vault,
      PROVIDER(this.chain)
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
      0
    );
    
    const approveTxn = approve(
      bestTokenAddressToZapIn,
      this.protocolContract.address,
      amountToZapIn,
      updateProgress,
      this.chainId
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
    const userBalance = await this.assetBalanceOf(owner);
    const latestAssetPrice = await this.assetUsdPrice(tokenPricesMappingTable);
    return (userBalance / Math.pow(10, this.assetDecimals)) * latestAssetPrice;
  }

  async assetUsdPrice(tokenPricesMappingTable) {
    return tokenPricesMappingTable[this.symbolOfBestTokenToZapInOut];
  }
  
  async stakeBalanceOf(owner) {
    return ethers.BigNumber.from(0);
  }

  _getTheBestTokenAddressToZapIn(inputToken, tokenAddress, InputTokenDecimals) {
    return [
      this.symbolOfBestTokenToZapInOut,
      this.zapInOutTokenAddress,
      this.assetDecimals,
    ];
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
      updateProgress
    );

    const [
      symbolOfBestTokenToZapInOut,
      bestTokenAddressToZapInOut,
      decimalsOfZapInOutToken,
    ] = this._getTheBestTokenAddressToZapOut();

    const burnTxn = prepareContractCall({
      contract: this.protocolContract,
      method: "redeem",
      params: [amount],
    });

    const [claimTxns, _] = await this.customClaim(
      owner,
      tokenPricesMappingTable,
      updateProgress,
    );

    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-withdraw`,
      0
    );

    return [
      [burnTxn, ...claimTxns],
      symbolOfBestTokenToZapInOut,
      bestTokenAddressToZapInOut,
      decimalsOfZapInOutToken,
      amount
    ];
  }
}

