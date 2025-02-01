import { ethers } from "ethers";
import { ERC20_ABI } from "@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import { encodeFunctionData } from "viem";
import CamelotNFTPositionManager from "../../lib/contracts/CamelotNFTPositionManager.json" assert { type: "json" };
import { fetch1InchSwapData } from "../../utils/oneInch.js";
import {
  approve,
  CHAIN_ID_TO_CHAIN,
  PROVIDER,
  CHAIN_TO_CHAIN_ID,
} from "../../utils/general.js";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb.js";
import BaseProtocol from "../BaseProtocol.js";
import AlgebraPool from "../../lib/contracts/Camelot/AlgebraPool.json" assert { type: "json" };

export class BaseCamelot extends BaseProtocol {
  constructor(chain, chainId, symbolList, mode, customParams) {
    super(chain, chainId, symbolList, mode, customParams);
    this.protocolName = "camelot";
    this.protocolVersion = "v3";
    this.assetDecimals = 18;
    this.token_id;

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
      abi: AlgebraPool,
    });
    this.stakeFarmContract = getContract({
      client: THIRDWEB_CLIENT,
      address: this.customParams.protocolAddress,
      chain: CHAIN_ID_TO_CHAIN[this.chainId],
      abi: ERC20_ABI,
    });

    this.assetContractInstance = new ethers.Contract(
      this.assetContract.address,
      CamelotNFTPositionManager,
      PROVIDER(this.chain),
    );
    this.protocolContractInstance = new ethers.Contract(
      this.protocolContract.address,
      AlgebraPool,
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
  async assetBalanceOf(recipient) {
    if (!this.token_id) {
      this.token_id = await this._getNftID(recipient);
    }
    if (!this.token_id) {
      return undefined;
    }
    try {
      const position = await this.assetContractInstance.functions.positions(
        this.token_id,
      );
      return position.liquidity;
    } catch (error) {
      // it means the NFT has been burned
      return undefined;
    }
  }
  async usdBalanceOf(owner, tokenPricesMappingTable) {
    if (!this.token_id) {
      this.token_id = await this._getNftID(owner);
    }
    if (this.token_id === 0) {
      return 0;
    }
    return await this.getNFTValue(
      this.token_id,
      this.protocolContractInstance,
      this.assetContractInstance,
      tokenPricesMappingTable,
      this.customParams.lpTokens[0][0],
      this.customParams.lpTokens[1][0],
      this.customParams.lpTokens[0][2],
      this.customParams.lpTokens[1][2],
    );
  }
  async assetUsdPrice(tokenPricesMappingTable) {
    return 0;
  }

  async stakeBalanceOf(owner) {
    // Get NFT positions balance
    return ethers.BigNumber.from(0);
  }
  rewards() {
    return this.customParams.rewards;
  }

  async pendingRewards(owner, tokenPricesMappingTable, updateProgress) {
    // TODO(david): we're missing Grail rewards + fee: https://docs.algebra.finance/algebra-integral-documentation/algebra-integral-technical-reference/integration-process/subgraphs-and-analytics/examples-of-queries#general-position-data
    if (!this.token_id) {
      this.token_id = await this._getNftID(owner);
    }
    if (this.token_id === 0) {
      return {};
    }
    const [
      [token0, token0Address, token0Decimals],
      [token1, token1Address, token1Decimals],
    ] = this.customParams.lpTokens;
    const { fees0, fees1 } = await this.getUncollectedFeesForCamelot(
      this.token_id,
      this.assetContractInstance,
      this.protocolContractInstance,
    );
    const rewardBalance = {
      [token0Address]: {
        symbol: token0,
        balance: ethers.BigNumber.from(String(Math.floor(fees0))),
        usdDenominatedValue:
          tokenPricesMappingTable[token0] * (fees0 / 10 ** token0Decimals),
        decimals: token0Decimals,
      },
      [token1Address]: {
        symbol: token1,
        balance: ethers.BigNumber.from(String(Math.floor(fees1))),
        usdDenominatedValue:
          tokenPricesMappingTable[token1] * (fees1 / 10 ** token1Decimals),
        decimals: token1Decimals,
      },
    };
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
        this.assetContract.address,
        token.amount,
        updateProgress,
        this.chainId,
      ),
    );
    let depositTxn;
    if (!this.token_id) {
      this.token_id = await this._getNftID(owner);
    }
    if (this.token_id) {
      depositTxn = this._increateLiquidityToExistingNFT(
        this.token_id,
        tokens[0].amount,
        tokens[1].amount,
        slippage,
      );
    } else {
      depositTxn = this._mintLpNFT(
        owner,
        tokens[0].amount,
        tokens[1].amount,
        slippage,
      );
    }
    return [approveTxns, depositTxn];
  }
  async _calculateTokenAmountsForLP(
    usdAmount,
    tokenMetadatas,
    tickers,
    tokenPricesMappingTable,
  ) {
    const { tickLower, tickUpper } = tickers;
    const token0 = tokenMetadatas[0][0];
    const token1 = tokenMetadatas[1][0];
    const token0Decimals = tokenMetadatas[0][2];
    const token1Decimals = tokenMetadatas[1][2];
    const minPrice =
      1.0001 ** tickLower * 10 ** (18 * 2 - token0Decimals - token1Decimals);
    const maxPrice =
      1.0001 ** tickUpper * 10 ** (18 * 2 - token0Decimals - token1Decimals);
    const ratio = this.calculateUniswapV3LP(
      usdAmount,
      tokenPricesMappingTable[tokenMetadatas[0][0]],
      tokenPricesMappingTable[tokenMetadatas[1][0]],
      tokenPricesMappingTable[tokenMetadatas[0][0]] /
        tokenPricesMappingTable[tokenMetadatas[1][0]],
      minPrice,
      maxPrice,
      tokenPricesMappingTable[token0],
      tokenPricesMappingTable[token1],
      token0Decimals,
      token1Decimals,
    );
    return ratio;
  }
  async customClaim(owner, tokenPricesMappingTable, updateProgress) {
    const [
      [token0, token0Address, token0Decimals],
      [token1, token1Address, token1Decimals],
    ] = this.customParams.lpTokens;
    const pendingRewards = await this.pendingRewards(
      owner,
      tokenPricesMappingTable,
      updateProgress,
    );
    const claimTxn = prepareContractCall({
      contract: this.assetContract,
      method: "collect",
      params: [
        {
          tokenId: this.token_id,
          recipient: owner,
          amount0Max: ethers.BigNumber.from(
            "340282366920938463463374607431768211455",
          ), // 2^128 - 1
          amount1Max: ethers.BigNumber.from(
            "340282366920938463463374607431768211455",
          ), // 2^128 - 1
        },
      ],
    });
    return [[claimTxn], pendingRewards];
  }

  async lockUpPeriod() {
    return 0;
  }
  async _stakeLP(amount, updateProgress) {
    await super._stakeLP(amount, updateProgress);
    return [];
  }
  async _unstakeLP(owner, percentage, updateProgress) {
    await super._unstakeLP(owner, percentage, updateProgress);
    const percentageBN = ethers.BigNumber.from(
      String(Math.floor(percentage * 10000)),
    );
    const assetBalance = await this.assetBalanceOf(owner);
    if (assetBalance === undefined) {
      return [[], undefined];
    }
    const amount = assetBalance.mul(percentageBN).div(10000);
    return [[], amount];
  }
  async _withdrawLPAndClaim(
    owner,
    amount,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    await super._withdrawLPAndClaim(
      owner,
      amount,
      slippage,
      tokenPricesMappingTable,
      updateProgress,
    );
    if (!this.token_id) {
      this.token_id = await this._getNftID(owner);
    }
    const { amount0, amount1 } = await this.getWithdrawalAmounts(
      this.token_id,
      this.assetContractInstance,
      this.protocolContractInstance,
      amount,
    );
    const amount0Min = this.mul_with_slippage_in_bignumber_format(
      amount0,
      slippage,
    );
    const amount1Min = this.mul_with_slippage_in_bignumber_format(
      amount1,
      slippage,
    );
    await this._updateProgressAndWait(
      updateProgress,
      `${this.uniqueId()}-withdraw`,
      0,
    );

    const [claimTxns] = await this.customClaim(
      owner,
      tokenPricesMappingTable,
      updateProgress,
    );
    const burnTxn = this._prepareBurnTransaction();
    if (amount.toString() === "0") {
      return [
        [...claimTxns, burnTxn],
        this.customParams.lpTokens,
        [amount0, amount1],
      ];
    }

    const liquidity = await this.assetBalanceOf(owner);
    const withdrawTxn = this._prepareWithdrawTransaction(
      amount,
      amount0Min,
      amount1Min,
    );
    const transactions = amount.eq(liquidity)
      ? [withdrawTxn, ...claimTxns, burnTxn]
      : [withdrawTxn, ...claimTxns];

    return [transactions, this.customParams.lpTokens, [amount0, amount1]];
  }

  _prepareBurnTransaction() {
    return prepareContractCall({
      contract: this.assetContract,
      method: "burn",
      params: [this.token_id],
    });
  }

  _prepareWithdrawTransaction(amount, amount0Min, amount1Min) {
    // 0x08c379a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000014507269636520736c69707061676520636865636b000000000000000000000000
    // means the return amount is less than amount0Min and amount1Min
    return prepareContractCall({
      contract: this.assetContract,
      method: "decreaseLiquidity",
      params: [
        {
          tokenId: this.token_id,
          liquidity: amount,
          // amount0Min: 0,
          // amount1Min: 0,
          amount0Min,
          amount1Min,
          deadline: this.getDeadline(),
        },
      ],
    });
  }

  _increateLiquidityToExistingNFT(
    tokenId,
    token0Amount,
    token1Amount,
    slippage,
  ) {
    return prepareContractCall({
      contract: this.assetContract,
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
      contract: this.assetContract,
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

  async _getNftID(address) {
    const { tickLower, tickUpper } = this.customParams.tickers;
    const uniqueKey = `${this.assetContract.address.toLowerCase()}/${this.customParams.lpTokens[0][1].toLowerCase()}/${this.customParams.lpTokens[1][1].toLowerCase()}/${tickLower}/${tickUpper}`;
    const chainString = Object.entries(CHAIN_TO_CHAIN_ID).find(
      ([key, value]) => value === this.chainId,
    )[0];
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/${address}/nft/tvl_highest?token_addresses=${this.assetContract.address}&chain=${chainString}`,
    );
    const data = await response.json();
    // Filter entries by uniqueKey before sorting

    const filteredData = Object.entries(data).filter(
      ([key]) => key === uniqueKey,
    );
    const sortedData = filteredData.sort(
      (a, b) => b[1].liquidity - a[1].liquidity,
    );
    if (sortedData.length < 1) {
      return 0;
    }
    return sortedData[0][1]?.token_id ?? 0;
  }
}
