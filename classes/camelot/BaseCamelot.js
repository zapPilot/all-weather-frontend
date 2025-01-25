import { ethers } from "ethers";
import { ERC20_ABI } from "@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import { encodeFunctionData } from "viem";
import CamelotNFTPositionManager from "../../lib/contracts/CamelotNFTPositionManager.json" assert { type: "json" };
import { fetch1InchSwapData } from "../../utils/oneInch.js";
import { approve, CHAIN_ID_TO_CHAIN, PROVIDER, CHAIN_TO_CHAIN_ID } from "../../utils/general.js";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb.js";
import BaseProtocol from "../BaseProtocol.js";
import { approvalBufferParam, slippageForLPV2 } from "../slippageUtils.js";
import assert from "assert";

export class BaseCamelot extends BaseProtocol {
  static lpTokenAddress = "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15";

  constructor(chain, chainId, symbolList, mode, customParams) {
    super(chain, chainId, symbolList, mode, customParams);
    this.protocolName = "camelot";
    this.protocolVersion = "v3";
    this.assetDecimals = 18;

    this.assetContract = getContract({
      client: THIRDWEB_CLIENT,
      address: this.customParams.assetAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: CamelotNFTPositionManager,
    });
    this.protocolContract = getContract({
      client: THIRDWEB_CLIENT,
      address: this.customParams.protocolAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: CamelotNFTPositionManager,
    });
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      address: this.customParams.protocolAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: CamelotNFTPositionManager,
    });

    this.assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      CamelotNFTPositionManager,
      PROVIDER(this.chain),
    );
    this.assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    this.protocolContractInstance = new ethers.Contract(
      this.protocolContract.address,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    this.stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    this._checkIfParamsAreSet();
    
  }
  rewards() {
    return [
      {
        symbol: "grail",
        priceId: {
          coinmarketcapApiId: 22949,
        },
        address: "0x3d9907F9a368ad0a51Be60f7Da3b97cf940982D8",
        decimals: 18,
      },
    ];
  }
  async usdBalanceOf(owner, tokenPricesMappingTable) {
    // const lpBalance = await this.stakeBalanceOf(owner, () => {});
    // const lpPrice = await this._calculateLpPrice(tokenPricesMappingTable);
    // return lpBalance * lpPrice;
    return 0
    return 0
  }
  async assetUsdPrice(tokenPricesMappingTable) {
    return 0

    const assetUsdPrice = await this._calculateLpPrice(tokenPricesMappingTable);
    return assetUsdPrice;
  }
  async stakeBalanceOf(owner, updateProgress) {
    return 0

    const stakeFarmContractInstance = new ethers.Contract(
      this.stakeFarmContract.address,
      ERC20_ABI,
      PROVIDER(this.chain),
    );
    return (await stakeFarmContractInstance.functions.balanceOf(owner))[0];
  }
  rewards() {
    return []; // Implement if Camelot has rewards
  }

  async pendingRewards(owner, tokenPricesMappingTable, updateProgress) {
    // Implement if Camelot has rewards
    return {};
  }

  async customDepositLP(
    owner,
    tokenAmetadata,
    tokenBmetadata,
    tokenPricesMappingTable,
    slippage,
    updateProgress,
  ) {
    console.log("start customDepositLP");
    // Prepare token amounts and approvals
    const tokens = [tokenAmetadata, tokenBmetadata].map(
      ([symbol, address, decimals, amount]) => ({
        address,
        amount,
        minAmount: this.mul_with_slippage_in_bignumber_format(amount, slippage),
        decimals,
        symbol,
      }),
    );
    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-deposit`,
      0,
    );
    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-stake`,
      0,
    );
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
    const nftPositionUniqueKey = this._getNFTPositionUniqueKey(tokenAmetadata[1], tokenBmetadata[1], this.customParams.tickers.tickLower, this.customParams.tickers.tickUpper);
    let depositTxn; 
    const token_id = await this._getExistingInvestmentPositionsByChain(owner, nftPositionUniqueKey)
    console.log("existingInvestmentPositionId", token_id)
    if (
      token_id
    ) {
      console.log("increasing liquidity to existing NFT", owner, tokens[0].amount, tokens[1].amount, slippage)
      depositTxn = 
        this._increateLiquidityToExistingNFT(
          token_id,
          tokens[0].amount,
          tokens[1].amount,
          slippage,
        );
    } else {
      console.log("minting new NFT", owner, tokens[0].amount, tokens[1].amount, slippage)
      depositTxn = this._mintLpNFT(owner, tokens[0].amount, tokens[1].amount, slippage);
    }
    return [approveTxns, depositTxn];
  }
  async _calculateTokenAmountsForLP(usdAmount, tokenMetadatas, tickers, tokenPricesMappingTable) {
    const { tickLower, tickUpper } = tickers;
    const token0 = tokenMetadatas[0][0]
    const token1 = tokenMetadatas[1][0]
    const token0Decimals = tokenMetadatas[0][2];
    const token1Decimals = tokenMetadatas[1][2];
    const minPrice =
      1.0001 ** tickLower *
      10 ** (18 * 2 - token0Decimals - token1Decimals);
    const maxPrice =
      1.0001 ** tickUpper *
      10 ** (18 * 2 - token0Decimals - token1Decimals);
    const ratio = this.calculateUniswapV3LP(
      usdAmount, 
      tokenPricesMappingTable[tokenMetadatas[0][0]],
      tokenPricesMappingTable[tokenMetadatas[1][0]],
      tokenPricesMappingTable[tokenMetadatas[0][0]] / tokenPricesMappingTable[tokenMetadatas[1][0]],
      minPrice,
      maxPrice,
      tokenPricesMappingTable[token0],
      tokenPricesMappingTable[token1]
    )
    return ratio
  }
  async customClaim(owner, tokenPricesMappingTable, updateProgress) {
    // Implement if Camelot has claimable rewards
    return [[], {}];
  }

  async usdBalanceOf(owner, tokenPricesMappingTable) {
    const lpBalance = await this.stakeBalanceOf(owner);
    const lpPrice = await this._calculateLpPrice(tokenPricesMappingTable);
    return lpBalance * lpPrice;
  }

  async assetUsdPrice(tokenPricesMappingTable) {
    return await this._calculateLpPrice(tokenPricesMappingTable);
  }

  async stakeBalanceOf(owner) {
    // Get NFT positions balance
    const balance = await this.assetContractInstance.functions.balanceOf(owner);
    return balance[0];
  }

  async _calculateLpPrice(tokenPricesMappingTable) {
    // Implement LP price calculation based on token reserves and prices
    // This is a placeholder - you'll need to implement the actual calculation
    return 0;
  }

  async lockUpPeriod() {
    return 0;
  }
  async _stakeLP(amount, updateProgress) {
    await super._stakeLP(amount, updateProgress);
    return []
  }
  _getNFTPositionUniqueKey(token0, token1, tickLower, tickUpper) {
    return `${BaseCamelot.lpTokenAddress.toLowerCase()}/${token0.toLowerCase()}/${token1.toLowerCase()}/${
      tickLower
    }/${tickUpper}`;
  }
  _increateLiquidityToExistingNFT(
    tokenId,
    token0Amount,
    token1Amount,
    slippage,
  ) {
    return prepareContractCall({
      contract: this.protocolContract,
      method: "increaseLiquidity",
      params: [
        {
          tokenId,
          amount0Desired: token0Amount,
          amount1Desired: token1Amount,
          amount0Min: 1,
          amount1Min: 1,
          deadline: Math.floor(Date.now() / 1000) + 600,
        },
      ],
    });
  }
  _mintLpNFT(owner, token0Amount, token1Amount, slippage) {
    return prepareContractCall({
      contract: this.protocolContract,
      method: "mint",
      params: [
        {
          token0: this.customParams.lpTokens[0][1],
          token1: this.customParams.lpTokens[1][1],
          tickLower: this.customParams.tickers.tickLower,
          tickUpper: this.customParams.tickers.tickUpper,
          amount0Desired: token0Amount,
          amount1Desired: token1Amount,
          amount0Min: 1,
          amount1Min: 1,
          recipient: owner,
          deadline: Math.floor(Date.now() / 1000) + 600,
        },
      ],
    });
  }

  async _getExistingInvestmentPositionsByChain(address, uniqueKey) {
    const chainString = Object.entries(CHAIN_TO_CHAIN_ID).find(([key, value]) => value === this.chainId)[0];
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/${address}/nft/tvl_highest?token_addresses=${this.assetContract.address}&chain=${chainString}`,
    );
    const data = await response.json();
    // Filter entries by uniqueKey before sorting
    const filteredData = Object.entries(data).filter(([key]) => key === uniqueKey);
    const sortedData = filteredData.sort((a, b) => b[1].liquidity - a[1].liquidity);
    if (sortedData.length < 1) {
      return undefined
    }
    console.log("sortedData", sortedData, sortedData[0][1]?.token_id)
    return sortedData[0][1]?.token_id ?? undefined;
  }
}

