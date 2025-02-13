import { tokensAndCoinmarketcapIdsFromDropdownOptions } from "../utils/contractInteractions";
import assert from "assert";
import { oneInchAddress } from "../utils/oneInch";
import axios from "axios";
import { getTokenDecimal, approve } from "../utils/general";
import { ethers } from "ethers";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../utils/thirdweb";
import ERC20_ABI from "../lib/contracts/ERC20.json" assert { type: "json" };
import WETH from "../lib/contracts/Weth.json" assert { type: "json" };
import ReactMarkdown from "react-markdown";
import getTheBestBridge from "./bridges/bridgeFactory";
import {
  CHAIN_ID_TO_CHAIN,
  CHAIN_TO_CHAIN_ID,
  TOKEN_ADDRESS_MAP,
} from "../utils/general";
import { toWei } from "thirdweb/utils";
import { fetch1InchSwapData } from "../utils/oneInch";
import { _updateProgressAndWait } from "../utils/general";
import { prepareTransaction } from "thirdweb";

const PROTOCOL_TREASURY_ADDRESS = "0x2eCBC6f229feD06044CDb0dD772437a30190CD50";
const REWARD_SLIPPAGE = 0.8;

class PriceService {
  static STATIC_PRICES = {
    usd: 1,
    usdc: 1,
    usdt: 1,
    dai: 1,
    frax: 0.997,
    usde: 1,
    usdx: 0.9971,
  };

  static MAX_RETRIES = 5;
  static RETRY_DELAY = 5000;
  static TIMEOUT = 3000;

  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.cache = {};
  }

  async fetchPrice(token, priceID) {
    const { key, provider } = this._getPriceServiceInfo(priceID);
    let lastError;
    let backoffDelay = PriceService.RETRY_DELAY;

    for (let attempt = 1; attempt <= PriceService.MAX_RETRIES; attempt++) {
      try {
        const endpoint = this._buildEndpoint(provider, key);
        const response = await axios.get(endpoint, {
          timeout: PriceService.TIMEOUT,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          validateStatus: (status) => status >= 200 && status < 500,
          maxRedirects: 5,
        });

        if (response.data?.price != null) {
          return response.data.price;
        }
        throw new Error("Invalid price data received");
      } catch (error) {
        lastError = error;
        const errorMessage = error.response?.data?.message || error.message;
        console.warn(
          `Attempt ${attempt}/${PriceService.MAX_RETRIES} failed to fetch price for ${token} from ${provider}:`,
          errorMessage,
        );

        if (attempt < PriceService.MAX_RETRIES) {
          const jitter = Math.random() * 1000;
          await new Promise((resolve) =>
            setTimeout(resolve, backoffDelay + jitter),
          );
          backoffDelay *= 2;
        }
      }
    }

    const fallbackPrice = this._getFallbackPrice(token);
    if (fallbackPrice !== null) {
      console.warn(`Using fallback price for ${token}: ${fallbackPrice}`);
      return fallbackPrice;
    }

    console.error(
      `All attempts failed to fetch price for ${token} from ${provider}:`,
      lastError,
    );
    return null;
  }

  _getFallbackPrice(token) {
    if (token.toLowerCase() in PriceService.STATIC_PRICES) {
      return PriceService.STATIC_PRICES[token.toLowerCase()];
    }
    return null;
  }

  _getPriceServiceInfo(priceID) {
    if (priceID?.coinmarketcapApiId) {
      return {
        key: priceID.coinmarketcapApiId,
        provider: "coinmarketcap",
        uniqueId: priceID.coinmarketcapApiId,
      };
    } else if (priceID?.geckoterminal) {
      return {
        key: priceID.geckoterminal,
        provider: "geckoterminal",
        uniqueId: priceID.geckoterminal.chain + priceID.geckoterminal.address,
      };
    }
    throw new Error(`Invalid price ID format: ${JSON.stringify(priceID)}`);
  }

  _buildEndpoint(provider, key) {
    if (provider === "coinmarketcap") {
      return `${this.apiUrl}/token/${key}/price`;
    } else if (provider === "geckoterminal") {
      return `${this.apiUrl}/token/${key.chain}/${key.address}/price`;
    }
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

class TokenPriceBatcher {
  static BATCH_SIZE = 2;
  static DELAY_MS = 2000;

  constructor(priceService) {
    this.priceService = priceService;
  }

  async fetchPrices(tokensToFetch) {
    const prices = { ...PriceService.STATIC_PRICES };

    for (
      let i = 0;
      i < tokensToFetch.length;
      i += TokenPriceBatcher.BATCH_SIZE
    ) {
      const batch = tokensToFetch.slice(i, i + TokenPriceBatcher.BATCH_SIZE);
      await this._processBatch(batch, prices);

      if (i + TokenPriceBatcher.BATCH_SIZE < tokensToFetch.length) {
        await this._delay();
      }
    }

    return prices;
  }

  async _processBatch(batch, prices) {
    // Process requests concurrently using Promise.all
    const pricePromises = batch.map(async ([token, priceID]) => {
      // Return price of 1 if in test mode
      if (process.env.TEST === "true") {
        return { token, price: 1 };
      }

      const { uniqueId } = this.priceService._getPriceServiceInfo(priceID);

      // Check cache first
      if (this.priceService.cache[uniqueId]) {
        return { token, price: this.priceService.cache[uniqueId] };
      }

      // Fetch price if not in cache
      const price = await this.priceService.fetchPrice(token, priceID);
      if (price !== null) {
        this.priceService.cache[uniqueId] = price;
      }
      return { token, price };
    });

    // Wait for all price requests to complete
    const results = await Promise.all(pricePromises);

    // Update prices object with results
    results.forEach(({ token, price }) => {
      if (price !== null) {
        prices[token] = price;
      }
    });
  }

  _delay() {
    return new Promise((resolve) =>
      setTimeout(resolve, TokenPriceBatcher.DELAY_MS),
    );
  }
}

export class BasePortfolio {
  constructor(strategy, weightMapping, portfolioName) {
    this.portfolioName = portfolioName;
    this.strategy = strategy;
    this.portfolioAPR = {};
    this.existingInvestmentPositions = {};
    this.assetAddressSetByChain = this._getAssetAddressSetByChain();
    this.uniqueTokenIdsForCurrentPrice =
      this._getUniqueTokenIdsForCurrentPrice();
    this.weightMapping = weightMapping;
    this.bridgeUsdThreshold = 10;
  }
  async initialize() {
    this.existingInvestmentPositions =
      await this._getExistingInvestmentPositionsByChain(
        account.address,
        updateProgress,
      );
  }
  description() {
    return (
      <ReactMarkdown>
        {`
    1. Liquidation fees from perpetual exchanges
    2. Farming rewards from new protocols
    (non-sustainable)
    3. Swap fees
    4. Interest from lending
    `}
      </ReactMarkdown>
    );
  }

  denomination() {
    throw new Error("Method 'denomination()' must be implemented.");
  }
  async lockUpPeriod(address) {
    let maxLockUpPeriod = 0;
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocols of Object.values(protocolsInThisCategory)) {
        for (const protocol of protocols) {
          if (protocol.weight === 0) {
            continue;
          }
          if (typeof protocol.interface.lockUpPeriod !== "function") {
            throw new Error("Method 'lockUpPeriod()' must be implemented.");
          }
          const lockUpPeriod = await protocol.interface.lockUpPeriod(address);
          maxLockUpPeriod = Math.max(maxLockUpPeriod, lockUpPeriod);
        }
      }
    }
    return maxLockUpPeriod;
  }
  rebalanceThreshold() {
    return 0.05;
  }
  async usdBalanceOf(address, portfolioAprDict) {
    console.time("usdBalanceOf");
    // Get token prices
    console.time("getTokenPricesMappingTable");
    const tokenPricesMappingTable = await this.getTokenPricesMappingTable();
    console.timeEnd("getTokenPricesMappingTable");

    // Get balances and rewards
    console.time("getBalances");
    const balanceResults = await this._getBalances(
      address,
      tokenPricesMappingTable,
    );
    console.timeEnd("getBalances");

    // Initialize balance dictionary with rewards
    let usdBalance = 0;
    const usdBalanceDict = this._initializeBalanceDict();

    // Process protocol balances
    this._processProtocolBalances(
      balanceResults,
      portfolioAprDict,
      usdBalanceDict,
    );
    // Calculate total balance
    usdBalance += this._calculateTotalBalance(balanceResults);
    // Calculate weights and differences
    const { negativeWeigtDiffSum, positiveWeigtDiffSum } =
      this._calculateWeightDifferences(usdBalanceDict, usdBalance);

    // Build metadata
    const metadata = this._buildMetadata(
      usdBalanceDict,
      negativeWeigtDiffSum,
      positiveWeigtDiffSum,
    );
    usdBalanceDict.metadata = metadata;
    console.timeEnd("usdBalanceOf");
    return [usdBalance, usdBalanceDict];
  }

  async _getBalances(address, tokenPricesMappingTable) {
    const balancePromises = Object.values(this.strategy)
      .flatMap((category) => Object.values(category))
      .flat()
      .map((protocol) => {
        return protocol.interface
          .usdBalanceOf(address, tokenPricesMappingTable)
          .then((balance) => ({ protocol, balance }));
      });
    return await Promise.all(balancePromises);
  }

  _initializeBalanceDict() {
    return {
      pendingRewards: {
        usdBalance: 0,
        weightDiff: 1,
        pendingRewardsDict: {},
        weight: 0,
        APR: 0,
        currentWeight: 0,
      },
    };
  }

  _processProtocolBalances(balanceResults, portfolioAprDict, usdBalanceDict) {
    for (const { protocol, balance } of balanceResults) {
      const protocolUniqueId = `${protocol.interface.uniqueId()}/${
        protocol.interface.constructor.name
      }`;
      usdBalanceDict[protocolUniqueId] = {
        chain: protocol.interface.chain,
        usdBalance: balance,
        weight: protocol.weight,
        symbol: protocol.interface.symbolList,
        protocol: protocol,
        APR: portfolioAprDict?.[protocol.interface.uniqueId()]?.apr * 100,
      };
    }
  }

  _calculateTotalBalance(balanceResults) {
    return balanceResults.reduce((sum, { balance }, index) => {
      if (
        balance === undefined ||
        typeof balance !== "number" ||
        isNaN(balance)
      ) {
        return sum;
      }
      const newSum = sum + balance;
      return newSum;
    }, 0);
  }

  _calculateWeightDifferences(usdBalanceDict, totalUsdBalance) {
    let negativeWeigtDiffSum = 0;
    let positiveWeigtDiffSum = 0;

    for (const [protocolUniqueId, data] of Object.entries(usdBalanceDict)) {
      if (protocolUniqueId === "pendingRewards") continue;

      const currentWeight = isNaN(data.usdBalance)
        ? 0
        : data.usdBalance / totalUsdBalance;
      data.weightDiff = currentWeight - data.weight;
      data.currentWeight = currentWeight;

      this._calculateZapOutPercentage(data, totalUsdBalance);

      if (data.weightDiff < 0) {
        negativeWeigtDiffSum += data.weightDiff;
      } else {
        positiveWeigtDiffSum += data.weightDiff;
      }
    }

    return { negativeWeigtDiffSum, positiveWeigtDiffSum };
  }

  _calculateZapOutPercentage(data, totalUsdBalance) {
    if (data.weight === 0 && data.usdBalance > 0) {
      data.zapOutPercentage = 1;
    } else if (data.weightDiff > this.rebalanceThreshold()) {
      data.zapOutPercentage =
        ((data.currentWeight - data.weight) * totalUsdBalance) /
        data.usdBalance;
    } else {
      data.zapOutPercentage = 0;
    }
  }

  _buildMetadata(usdBalanceDict, negativeWeigtDiffSum, positiveWeigtDiffSum) {
    const metadata = {
      weightDiffGroupByChain: {},
      rebalanceActionsByChain: [],
    };

    // Group weight differences by chain
    for (const data of Object.values(usdBalanceDict)) {
      if (!data.chain) continue;

      if (negativeWeigtDiffSum < 0) {
        data.negativeWeigtDiffSum = Math.abs(negativeWeigtDiffSum);
      }
      data.positiveWeigtDiffSum = positiveWeigtDiffSum;

      metadata.weightDiffGroupByChain[data.chain] =
        (metadata.weightDiffGroupByChain[data.chain] || 0) + data.weightDiff;
    }

    // Sort and determine rebalance actions
    const sortedChains = Object.entries(metadata.weightDiffGroupByChain).sort(
      (a, b) => b[1] - a[1],
    );

    metadata.rebalanceActionsByChain = sortedChains.map(
      ([chain, weightDiff]) => ({
        chain,
        actionName: weightDiff >= 0 ? "rebalance" : "zapIn",
      }),
    );

    return metadata;
  }

  async pendingRewards(owner, updateProgress) {
    const tokenPricesMappingTable = await this.getTokenPricesMappingTable();
    // Flatten the strategy structure and create pending rewards calculation promises
    const rewardsPromises = Object.values(this.strategy)
      .flatMap((category) => Object.values(category))
      .flat()
      .map((protocol) =>
        protocol.interface.pendingRewards(
          owner,
          tokenPricesMappingTable,
          updateProgress,
        ),
      );
    // Wait for all promises to resolve
    const allRewards = await Promise.all(rewardsPromises);
    // Combine all rewards
    const rewardsMappingTable = allRewards.reduce((acc, rewards) => {
      for (const [tokenAddress, rewardMetadata] of Object.entries(rewards)) {
        if (!acc[tokenAddress]) {
          acc[tokenAddress] = rewardMetadata;
        } else {
          // Preserve all existing fields and only update balance and usdDenominatedValue
          acc[tokenAddress] = {
            ...acc[tokenAddress],
            ...rewardMetadata,
            balance: acc[tokenAddress].balance.add(rewardMetadata.balance),
            usdDenominatedValue:
              acc[tokenAddress].usdDenominatedValue +
              rewardMetadata.usdDenominatedValue,
          };
        }
      }
      return acc;
    }, {});
    return {
      rewardUsdBalance: this.sumUsdDenominatedValues(rewardsMappingTable),
      pendingRewardsDict: rewardsMappingTable,
    };
  }

  // Function to sum up the usdDenominatedValue
  sumUsdDenominatedValues(mapping) {
    return Object.values(mapping).reduce((total, entry) => {
      return total + (entry.usdDenominatedValue || 0);
    }, 0);
  }

  mulSwapFeeRate(inputBigBumber) {
    return inputBigBumber.mul(299).div(100000);
  }

  swapFeeRate() {
    return 0.00299;
  }
  mulReferralFeeRate(inputBigBumber) {
    return inputBigBumber.mul(7).div(10);
  }
  referralFeeRate() {
    return 0.7;
  }
  async getPortfolioMetadata() {
    const allProtocols = Object.values(this.strategy)
      .flatMap((protocols) => Object.entries(protocols))
      .flatMap(([chain, protocolArray]) =>
        protocolArray.map((protocol) => ({ chain, protocol })),
      );

    const fetchPoolData = async ({ protocol }) => {
      const poolUniqueKey = protocol.interface.uniqueId();
      const url = `${process.env.NEXT_PUBLIC_API_URL}/pool/${poolUniqueKey}/apr`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        return {
          poolUniqueKey,
          apr: data.value,
          weight: protocol.weight,
          tvl: data.tvl,
        };
      } catch (error) {
        console.error(`Error fetching data for ${url}:`, error);
        return null;
      }
    };

    const poolDataResults = await Promise.all(allProtocols.map(fetchPoolData));

    const aprMappingTable = poolDataResults.reduce((acc, result) => {
      if (result) {
        const { poolUniqueKey, ...data } = result;
        acc[poolUniqueKey] = data;
      }
      return acc;
    }, {});
    const totalTvl = Object.values(aprMappingTable)
      .filter((pool) => pool.weight > 0)
      .reduce((sum, pool) => sum + pool.tvl, 0);

    aprMappingTable["portfolioAPR"] = Object.values(aprMappingTable).reduce(
      (sum, pool) => sum + pool.apr * pool.weight,
      0,
    );

    aprMappingTable["portfolioTVL"] = `${(totalTvl / 1000000).toFixed(2)}M`;
    return aprMappingTable;
  }

  async getExistingInvestmentPositions() {
    throw new Error(
      "Method 'getExistingInvestmentPositions()' must be implemented.",
    );
  }

  async portfolioAction(actionName, actionParams) {
    const updateProgress = (nodeID, tradingLoss) => {
      actionParams.setTradingLoss(tradingLoss);
      actionParams.setStepName(nodeID);
      actionParams.setTotalTradingLoss(
        (prevTotalTradingLoss) => prevTotalTradingLoss + tradingLoss,
      );
    };
    const tokenPricesMappingTable = await this.getTokenPricesMappingTable();
    actionParams.tokenPricesMappingTable = tokenPricesMappingTable;
    actionParams.updateProgress = updateProgress;
    return await this._generateTxnsByAction(actionName, actionParams);
  }

  async _generateTxnsByAction(actionName, actionParams) {
    let totalTxns = [];

    // Handle special pre-processing for specific actions
    if (actionName === "zapIn") {
      if (actionParams.tokenInSymbol === "eth") {
        const [wethTxn, wethAddress, wethSymbol] = this._wrapNativeToken(
          actionParams.tokenInSymbol,
          "deposit",
          actionParams.zapInAmount,
          actionParams.chainMetadata,
        );
        actionParams.tokenInSymbol = wethSymbol;
        actionParams.tokenInAddress = wethAddress;
        totalTxns.push(wethTxn);
      }
      if (actionParams.onlyThisChain === false) {
        const platformFee = this.mulSwapFeeRate(actionParams.zapInAmount);
        const normalizedPlatformFeeUSD =
          ethers.utils.formatUnits(platformFee, actionParams.tokenDecimals) *
          actionParams.tokenPricesMappingTable[actionParams.tokenInSymbol];
        const referrer = await this._getReferrer(actionParams.account);
        const platformFeeTxns = await this._getPlatformFeeTxns(
          actionParams.tokenInAddress,
          actionParams.chainMetadata,
          platformFee,
          referrer,
        );
        actionParams.zapInAmount = actionParams.zapInAmount.sub(platformFee);
        actionParams.setPlatformFee(-normalizedPlatformFeeUSD);
        totalTxns = totalTxns.concat(platformFeeTxns);
      }
    } else if (actionName === "rebalance") {
      return await this._generateRebalanceTxns(actionParams);
    } else if (actionName === "stake") {
      return await this._generateStakeTxns(
        actionParams.protocolAssetDustInWallet,
        actionParams.updateProgress,
      );
    }
    // Process each protocol
    const protocolTxns = await this._processProtocolActions(
      actionName,
      actionParams,
    );
    totalTxns = totalTxns.concat(protocolTxns);
    // Handle special post-processing for specific actions
    if (actionName === "zapOut") {
      const portfolioUsdBalance = (
        await this.usdBalanceOf(actionParams.account)
      )[0];
      if (portfolioUsdBalance > 0) {
        const swapFeeTxns = await this._swapFeeTxnsForZapOut(
          actionParams.account,
          actionParams.tokenOutAddress,
          actionParams.tokenOutSymbol,
          actionParams.tokenPricesMappingTable,
          actionParams.zapOutPercentage,
          portfolioUsdBalance,
          actionParams.chainMetadata,
          actionParams.setPlatformFee,
        );
        totalTxns = totalTxns.concat(swapFeeTxns);
      }
    }
    return totalTxns;
  }

  async _swap(
    walletAddress,
    fromTokenAddress,
    toTokenAddress,
    amount,
    slippage,
    updateProgress,
    fromToken,
    fromTokenDecimals,
    toTokenSymbol,
    toTokenDecimals,
    tokenPricesMappingTable,
    actionParams,
  ) {
    if (fromTokenAddress.toLowerCase() === toTokenAddress.toLowerCase()) {
      return;
    }
    const swapCallData = await fetch1InchSwapData(
      actionParams.chainMetadata.id,
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      slippage,
    );

    if (swapCallData["data"] === undefined) {
      throw new Error("Swap data is undefined. Cannot proceed with swapping.");
    }
    if (swapCallData["toAmount"] === 0) {
      throw new Error("To amount is 0. Cannot proceed with swapping.");
    }
    const approveTxn = approve(
      fromTokenAddress,
      swapCallData["to"],
      amount,
      () => {},
      actionParams.chainMetadata.id,
    );
    return [
      [
        approveTxn,
        prepareTransaction({
          to: swapCallData["to"],
          chain: CHAIN_ID_TO_CHAIN[actionParams.chainMetadata.id],
          client: THIRDWEB_CLIENT,
          data: swapCallData["data"],
          extraGas: BigInt(swapCallData["gasFee"]),
        }),
      ],
      swapCallData["toAmount"],
    ];
  }
  async _processProtocolActions(actionName, actionParams) {
    const currentChain = actionParams.chainMetadata.name
      .toLowerCase()
      .replace(" one", "");

    const actionHandlers = {
      zapIn: async (protocol, chain, derivative) => {
        if (protocol.weight === 0) return null;
        const percentageBN = ethers.BigNumber.from(
          String(Math.floor(protocol.weight * derivative * 10000)),
        );
        return protocol.interface.zapIn(
          actionParams.account,
          chain,
          actionParams.zapInAmount.mul(percentageBN).div(10000),
          actionParams.tokenInSymbol,
          actionParams.tokenInAddress,
          actionParams.tokenDecimals,
          actionParams.slippage,
          actionParams.tokenPricesMappingTable,
          actionParams.updateProgress,
        );
      },

      zapOut: async (protocol, chain) => {
        const protocolUsdBalance = await protocol.interface.usdBalanceOf(
          actionParams.account,
          actionParams.tokenPricesMappingTable,
        );
        if (protocolUsdBalance === 0) return null;
        let normalizedZapOutPercentage = actionParams.zapOutPercentage;
        if (
          protocolUsdBalance > 1 &&
          protocolUsdBalance * actionParams.zapOutPercentage < 1
        ) {
          // to avoid high slippage, we need to zap out at least 1 dollar
          normalizedZapOutPercentage = 1 / protocolUsdBalance;
        }
        return protocol.interface.zapOut(
          actionParams.account,
          normalizedZapOutPercentage,
          actionParams.tokenOutSymbol === "eth"
            ? TOKEN_ADDRESS_MAP.weth[chain]
            : actionParams.tokenOutAddress,
          actionParams.tokenOutSymbol === "eth"
            ? "weth"
            : actionParams.tokenOutSymbol,
          actionParams.tokenOutDecimals,
          actionParams.slippage,
          actionParams.tokenPricesMappingTable,
          actionParams.updateProgress,
          this.existingInvestmentPositions[chain],
        );
      },

      claimAndSwap: async (protocol, chain) => {
        return protocol.interface.claimAndSwap(
          actionParams.account,
          actionParams.outputToken,
          actionParams.outputTokenSymbol,
          actionParams.outputTokenDecimals,
          actionParams.slippage,
          actionParams.tokenPricesMappingTable,
          actionParams.updateProgress,
        );
      },

      transfer: async (protocol, chain) => {
        const protocolUsdBalance = await protocol.interface.usdBalanceOf(
          actionParams.account,
          actionParams.tokenPricesMappingTable,
        );
        if (protocolUsdBalance === 0) return null;
        return protocol.interface.transfer(
          actionParams.account,
          actionParams.zapOutPercentage,
          actionParams.updateProgress,
          actionParams.recipient,
        );
      },

      stake: async (protocol, chain) => {
        return protocol.stake(
          actionParams.protocolAssetDustInWallet,
          actionParams.updateProgress,
        );
      },
      bridge: async (chain, totalWeight) => {
        if (totalWeight === 0) return [];
        let inputToken =
          TOKEN_ADDRESS_MAP[actionParams.tokenInSymbol][currentChain];
        let inputAmount = String(
          Math.floor(
            actionParams.zapInAmount *
              totalWeight *
              (1 - actionParams.slippage / 100),
          ),
        );
        let txns = [];
        const allowedTokens = ["usdc", "eth", "weth"];
        if (!allowedTokens.includes(actionParams.tokenInSymbol.toLowerCase())) {
          const swapResult = await this._swap(
            actionParams.account,
            inputToken,
            TOKEN_ADDRESS_MAP["usdc"][currentChain],
            inputAmount,
            actionParams.slippage,
            actionParams.updateProgress,
            actionParams.tokenInSymbol,
            actionParams.tokenDecimals,
            "usdc",
            6,
            actionParams.tokenPricesMappingTable,
            actionParams,
          );
          // Update input token and amount after the swap
          txns = txns.concat(swapResult[0]);
          inputToken = TOKEN_ADDRESS_MAP["usdc"][currentChain];
          inputAmount = swapResult[1]; // Resulting amount after the swap
        }
        const inputAmountBN = ethers.BigNumber.from(inputAmount);
        const bridge = await getTheBestBridge();
        const targetToken = allowedTokens.includes(
          actionParams.tokenInSymbol.toLowerCase(),
        )
          ? TOKEN_ADDRESS_MAP[actionParams.tokenInSymbol.toLowerCase()][chain]
          : TOKEN_ADDRESS_MAP["usdc"][chain];

        const bridgeTxns = await bridge.getBridgeTxns(
          actionParams.account,
          actionParams.chainMetadata.id,
          CHAIN_TO_CHAIN_ID[chain],
          inputToken,
          targetToken,
          inputAmountBN,
          actionParams.updateProgress,
        );

        return [...txns, ...bridgeTxns];
      },
    };

    const processProtocolTxns = async (currentChain) => {
      const protocolPromises = [];

      for (const protocolsInThisCategory of Object.values(this.strategy)) {
        for (const [chain, protocols] of Object.entries(
          protocolsInThisCategory,
        )) {
          if (chain.toLowerCase() !== currentChain) continue;

          const totalWeight = protocols.reduce(
            (sum, protocol) => sum + (protocol.weight || 0),
            0,
          );

          const derivative =
            actionParams.onlyThisChain === true ? 1 / totalWeight : 1;

          // Process all protocols in parallel
          const chainProtocolPromises = protocols.map(async (protocol) => {
            try {
              const txns = await actionHandlers[actionName](
                protocol,
                chain,
                derivative,
              );
              return txns || [];
            } catch (error) {
              console.error(
                `Error processing protocol ${protocol.interface?.uniqueId?.()}:`,
                error,
              );
              return [];
            }
          });

          protocolPromises.push(...chainProtocolPromises);
        }
      }

      // Wait for all protocol transactions to complete
      const results = await Promise.all(protocolPromises);
      return results.flat().filter(Boolean);
    };

    const processBridgeTxns = async (currentChain) => {
      const bridgePromises = [];

      for (const protocolsInThisCategory of Object.values(this.strategy)) {
        const targetChains = Object.entries(protocolsInThisCategory)
          .filter(([chain]) => chain.toLowerCase() !== currentChain)
          .map(([chain, protocols]) => ({
            chain,
            totalWeight: protocols.reduce(
              (sum, protocol) => sum + (protocol.weight || 0),
              0,
            ),
          }));

        // Process all bridge transactions in parallel
        const categoryBridgePromises = targetChains.map(
          async ({ chain, totalWeight }) => {
            if (totalWeight === 0) return [];
            try {
              return await actionHandlers["bridge"](chain, totalWeight);
            } catch (error) {
              console.error(`Error processing bridge to ${chain}:`, error);
              return [];
            }
          },
        );

        bridgePromises.push(...categoryBridgePromises);
      }

      // Wait for all bridge transactions to complete
      const results = await Promise.all(bridgePromises);
      return results.flat().filter(Boolean);
    };

    // Execute protocol and bridge transactions in parallel
    const [protocolTxns, bridgeTxns] = await Promise.all([
      processProtocolTxns(currentChain),
      actionParams.onlyThisChain ? [] : processBridgeTxns(currentChain),
    ]);

    if (protocolTxns.length === 0) throw new Error("No protocol txns");

    // Combine all transactions, with bridge transactions at the end
    return [...protocolTxns, ...bridgeTxns];
  }

  async _generateRebalanceTxns(actionParams) {
    const {
      account: owner,
      slippage,
      tokenPricesMappingTable,
      updateProgress,
      rebalancableUsdBalanceDict,
      chainMetadata,
      onlyThisChain,
    } = actionParams;

    const currentChain = chainMetadata.name.toLowerCase().replace(" one", "");
    const middleTokenConfig = this._getRebalanceMiddleTokenConfig(currentChain);

    // Run bridge initialization and protocol filtering in parallel
    const [bridge, rebalancableUsdBalanceDictOnThisChain] = await Promise.all([
      getTheBestBridge(),
      this._filterProtocolsForChain(rebalancableUsdBalanceDict, currentChain),
    ]);

    // Generate zap out transactions and calculate total USDC balance
    const [zapOutTxns, zapOutUsdcBalance] = await this._generateZapOutTxns(
      owner,
      middleTokenConfig,
      slippage,
      tokenPricesMappingTable,
      updateProgress,
      rebalancableUsdBalanceDictOnThisChain,
      currentChain,
      onlyThisChain,
    );

    if (zapOutUsdcBalance === 0) return [];

    const zapOutAmount = ethers.utils.parseUnits(
      (
        zapOutUsdcBalance / tokenPricesMappingTable[middleTokenConfig.symbol]
      ).toFixed(middleTokenConfig.decimals),
      middleTokenConfig.decimals,
    );

    // Calculate zap in amount including pending rewards
    const zapInAmount = this._calculateZapInAmount(
      zapOutAmount,
      rebalancableUsdBalanceDictOnThisChain,
      slippage,
      middleTokenConfig,
      tokenPricesMappingTable,
    );

    // Run approval, fee, and zap in transactions generation in parallel
    const [
      [approvalAndFeeTxns, zapInAmountAfterFee],
      zapInTxns,
      rebalancableUsdBalanceDictOnOtherChains,
    ] = await Promise.all([
      this._generateApprovalAndFeeTxns(
        middleTokenConfig,
        zapInAmount,
        chainMetadata,
        actionParams,
      ),
      this._generateZapInTxns(
        owner,
        rebalancableUsdBalanceDictOnThisChain,
        zapInAmount,
        middleTokenConfig,
        slippage,
        tokenPricesMappingTable,
        updateProgress,
      ),
      this.filterProtocolsForOtherChains(
        rebalancableUsdBalanceDict,
        currentChain,
      ),
    ]);

    // Combine initial transactions
    const initialTxns = [...zapOutTxns, ...approvalAndFeeTxns, ...zapInTxns];

    // If no other chains to process, return current transactions
    if (Object.keys(rebalancableUsdBalanceDictOnOtherChains).length === 0) {
      return initialTxns;
    }

    // Process bridge transactions in parallel
    const bridgePromises = Object.entries(
      rebalancableUsdBalanceDictOnOtherChains,
    ).map(async ([chain, metadata]) => {
      const totalWeight = metadata.totalWeight;
      const bridgeAmount = ethers.BigNumber.from(
        String(Math.floor(Number(zapInAmountAfterFee) * totalWeight)),
      );

      const bridgeUsd =
        Number(bridgeAmount.toString()) *
        tokenPricesMappingTable[
          this._getRebalanceMiddleTokenConfig(currentChain).symbol
        ];

      if (bridgeUsd < this.bridgeUsdThreshold) return [];

      const bridgeToOtherChainTxns = await bridge.getBridgeTxns(
        owner,
        chainMetadata.id,
        CHAIN_TO_CHAIN_ID[chain],
        this._getRebalanceMiddleTokenConfig(currentChain).address,
        this._getRebalanceMiddleTokenConfig(chain).address,
        bridgeAmount,
        updateProgress,
      );

      await this._updateProgressAndWait(actionParams.updateProgress, chain, 0);
      return bridgeToOtherChainTxns;
    });

    const bridgeTxnsArrays = await Promise.all(bridgePromises);

    // Combine all transactions and return
    return [...initialTxns, ...bridgeTxnsArrays.flat()];
  }

  _getRebalanceMiddleTokenConfig(chain) {
    if (this.constructor.name === "StablecoinVault") {
      return {
        symbol: "usdc",
        address: TOKEN_ADDRESS_MAP["usdc"][chain],
        decimals: 6,
      };
    } else if (this.constructor.name === "EthVault") {
      return {
        symbol: "weth",
        address: TOKEN_ADDRESS_MAP["weth"][chain],
        decimals: 18,
      };
    } else if (this.constructor.name === "AllWeatherVault") {
      return {
        symbol: "weth",
        address: TOKEN_ADDRESS_MAP["weth"][chain],
        decimals: 18,
      };
    }
    return {
      symbol: "usdc",
      address: TOKEN_ADDRESS_MAP["usdc"][chain],
      decimals: 6,
    };
  }

  _filterProtocolsForChain(rebalancableUsdBalanceDict, currentChain) {
    return Object.fromEntries(
      Object.entries(rebalancableUsdBalanceDict).filter(
        ([key, metadata]) =>
          metadata.chain === currentChain || key === "pendingRewards",
      ),
    );
  }

  filterProtocolsForOtherChains(rebalancableUsdBalanceDict, currentChain) {
    // First filter protocols from other chains
    const otherChainProtocols = Object.entries(
      rebalancableUsdBalanceDict,
    ).filter(
      ([key, metadata]) =>
        metadata.chain !== currentChain &&
        key !== "pendingRewards" &&
        key !== "metadata" &&
        metadata.weightDiff < 0,
    );
    if (otherChainProtocols.length === 0) return {};
    const negativeWeigtDiffSum = otherChainProtocols[0][1].negativeWeigtDiffSum;
    // Group protocols by chain
    return otherChainProtocols.reduce((acc, [key, metadata]) => {
      if (metadata.weightDiff >= 0) return acc;

      if (!acc[metadata.chain]) {
        acc[metadata.chain] = {
          totalWeight: 0,
          protocols: [],
        };
      }

      // Calculate normalized weight using existing negativeWeigtDiffSum
      const normalizedWeight =
        Math.abs(metadata.weightDiff) / negativeWeigtDiffSum;
      acc[metadata.chain].totalWeight += normalizedWeight;
      acc[metadata.chain].protocols.push({
        key,
        ...metadata,
        normalizedWeight,
      });

      return acc;
    }, {});
  }

  async _generateZapOutTxns(
    owner,
    middleTokenConfig,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
    rebalancableDict,
    currentChain,
    onlyThisChain,
  ) {
    let txns = [];
    let zapOutUsdcBalance = 0;

    // Process all protocols in parallel for better performance
    const protocolPromises = Object.values(this.strategy).flatMap(
      (protocolsInThisCategory) =>
        Object.entries(protocolsInThisCategory).flatMap(
          async ([chain, protocols]) => {
            if (onlyThisChain && chain !== currentChain) return [];

            // Process all protocols in this chain in parallel
            const chainResults = await Promise.all(
              protocols.map(async (protocol) => {
                const [protocolTxns, protocolBalance] =
                  await this._processProtocolZapOut(
                    owner,
                    protocol,
                    middleTokenConfig,
                    slippage,
                    tokenPricesMappingTable,
                    updateProgress,
                    rebalancableDict,
                    chain,
                  );
                return { txns: protocolTxns, balance: protocolBalance };
              }),
            );

            return chainResults;
          },
        ),
    );

    // Wait for all protocol processing to complete
    const results = await Promise.all(protocolPromises);

    // Combine results
    results.flat().forEach((result) => {
      txns = txns.concat(result.txns);
      zapOutUsdcBalance += result.balance;
    });

    return [txns, zapOutUsdcBalance];
  }

  async _processProtocolZapOut(
    owner,
    protocol,
    middleTokenConfig,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
    rebalancableDict,
    chain,
  ) {
    const usdBalance = await protocol.interface.usdBalanceOf(
      owner,
      tokenPricesMappingTable,
    );
    if (usdBalance === 0) return [[], 0];

    const protocolClassName = `${protocol.interface.uniqueId()}/${
      protocol.interface.constructor.name
    }`;
    const zapOutPercentage =
      rebalancableDict[protocolClassName]?.zapOutPercentage;
    if (!zapOutPercentage || zapOutPercentage <= 0) return [[], 0];
    const zapOutTxns = await protocol.interface.zapOut(
      owner,
      zapOutPercentage,
      middleTokenConfig.address,
      middleTokenConfig.symbol,
      middleTokenConfig.decimals,
      slippage,
      tokenPricesMappingTable,
      updateProgress,
      {},
      this.existingInvestmentPositions[chain],
    );

    const protocolBalance =
      (usdBalance * zapOutPercentage * (100 - slippage)) / 100;

    return [zapOutTxns, protocolBalance];
  }

  _calculateZapInAmount(
    zapOutAmount,
    rebalancableDict,
    slippage,
    middleTokenConfig,
    tokenPricesMappingTable,
  ) {
    const rewardAmountInMiddleToken =
      (rebalancableDict.pendingRewards.usdBalance * REWARD_SLIPPAGE) /
      tokenPricesMappingTable[middleTokenConfig.symbol];
    const rewardAmount = ethers.utils.parseUnits(
      rewardAmountInMiddleToken.toFixed(middleTokenConfig.decimals),
      middleTokenConfig.decimals,
    );
    return this.mul_with_slippage_in_bignumber_format(
      zapOutAmount,
      slippage,
    ).add(rewardAmount);
  }

  async _generateApprovalAndFeeTxns(
    middleTokenConfig,
    zapInAmount,
    chainMetadata,
    actionParams,
  ) {
    const approveTxn = approve(
      middleTokenConfig.address,
      oneInchAddress,
      zapInAmount,
      () => {},
      chainMetadata.id,
    );

    // need to multiply by 2 because we charge for zap in and zap out
    const platformFee = this.mulSwapFeeRate(zapInAmount).mul(2);
    const zapInAmountAfterFee = zapInAmount.sub(platformFee);

    const rebalanceFeeTxns = await this._getSwapFeeTxnsForZapIn(
      actionParams,
      platformFee,
      middleTokenConfig,
    );

    return [[approveTxn, ...rebalanceFeeTxns], zapInAmountAfterFee];
  }

  async _generateZapInTxns(
    owner,
    rebalancableDict,
    zapInAmountAfterFee,
    middleTokenConfig,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    const txns = [];
    let activateStartZapInNode = false;

    for (const [key, metadata] of Object.entries(rebalancableDict)) {
      if (key === "pendingRewards" || metadata.weightDiff >= 0) continue;

      // negativeWeigtDiffSum is a derivative to scale weightdiff to a [0~1] number
      const percentageBN = ethers.BigNumber.from(
        String(
          Math.floor(
            (-metadata.weightDiff / metadata.negativeWeigtDiffSum) * 10000,
          ),
        ),
      );

      const zapInAmount = zapInAmountAfterFee.mul(percentageBN).div(10000);
      // pendle doesn't allow zap in amount less than $0.1
      if (zapInAmount < 100000) continue;

      const protocol = metadata.protocol;
      if (activateStartZapInNode === false) {
        await protocol.interface._updateProgressAndWait(
          updateProgress,
          "endOfZapOutOn" + metadata.chain,
          0,
        );
        activateStartZapInNode = true;
      }

      const protocolTxns = await protocol.interface.zapIn(
        owner,
        metadata.chain,
        zapInAmount,
        middleTokenConfig.symbol,
        middleTokenConfig.address,
        middleTokenConfig.decimals,
        slippage,
        tokenPricesMappingTable,
        updateProgress,
        this.existingInvestmentPositions["arbitrum"],
      );
      txns.push(...protocolTxns);
    }

    return txns;
  }

  async _generateStakeTxns(protocolAssetDustInWallet, updateProgress) {
    let txns = [];
    for (const metadata of Object.values(protocolAssetDustInWallet)) {
      if (metadata.assetBalance.toString() === "0") continue;
      const protocol = metadata.protocol;
      const stakeTxns = await protocol.stake(
        protocolAssetDustInWallet,
        updateProgress,
      );
      txns = txns.concat(stakeTxns);
    }
    return txns;
  }
  async _getProtocolUsdBalanceDictionary(owner, tokenPricesMappingTable) {
    const protocolPromises = Object.values(this.strategy)
      .flatMap((category) => Object.entries(category))
      .flatMap(([chain, protocols]) =>
        protocols
          .filter((protocol) => protocol.weight !== 0)
          .map(async (protocol) => {
            const protocolUsdBalance = await protocol.interface.usdBalanceOf(
              owner,
              tokenPricesMappingTable,
            );
            return {
              chain,
              address: protocol.interface.assetContract.address,
              protocolUsdBalance,
            };
          }),
      );

    const results = await Promise.all(protocolPromises);

    return results.reduce((acc, { chain, address, protocolUsdBalance }) => {
      if (!acc[chain]) acc[chain] = {};
      acc[chain][address] = protocolUsdBalance;
      return acc;
    }, {});
  }
  async calProtocolAssetDustInWalletDictionary(owner, tokenPricesMappingTable) {
    const protocolPromises = Object.values(this.strategy)
      .flatMap((category) => Object.entries(category))
      .flatMap(([chain, protocols]) =>
        protocols.map(async (protocol) => {
          const placeholderForStake = 1;
          if (
            protocol.interface.mode == "single" &&
            (await protocol.interface._stake(placeholderForStake, () => {}))
              .length === 0
          ) {
            return null;
          } else if (
            protocol.interface.mode == "LP" &&
            (await protocol.interface._stakeLP(placeholderForStake, () => {}))
              .length === 0
          ) {
            return null;
          }
          if (Object.keys(tokenPricesMappingTable).length === 0) return null;
          return {
            chain,
            protocol: protocol.interface,
            assetBalance: await protocol.interface.assetBalanceOf(owner),
            assetUsdBalanceOf: await protocol.interface.assetUsdBalanceOf(
              owner,
              tokenPricesMappingTable,
            ),
          };
        }),
      );

    const results = await Promise.all(protocolPromises);
    return results
      .filter((result) => result !== null)
      .reduce((acc, result) => {
        if (!acc[result.chain]) {
          acc[result.chain] = {};
        }
        acc[result.chain][result.protocol.assetContract.address] = {
          protocol: result.protocol,
          assetBalance: result.assetBalance,
          assetUsdBalanceOf: result.assetUsdBalanceOf,
        };
        return acc;
      }, {});
  }
  async _getExistingInvestmentPositionsByChain(address, updateProgress) {
    const chainPromises = Object.entries(this.assetAddressSetByChain).map(
      async ([chain, lpTokens]) => {
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL
          }/${address}/nft/tvl_highest?token_addresses=${Array.from(
            lpTokens,
          ).join("+")}&chain=${chain}`,
        );
        const data = await response.json();
        return { chain, data };
      },
    );

    const results = await Promise.all(chainPromises);

    return results.reduce((acc, { chain, data }) => {
      acc[chain] = data;
      return acc;
    }, {});
  }

  _getUniqueTokenIdsForCurrentPrice() {
    let coinMarketCapIdSet = {};
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocols of Object.values(protocolsInThisCategory)) {
        for (const protocol of protocols) {
          let apiSymbolToIdMapping = {};
          for (const reward of protocol.interface.rewards()) {
            apiSymbolToIdMapping[reward.symbol] = reward.priceId;
          }
          coinMarketCapIdSet = {
            ...coinMarketCapIdSet,
            ...apiSymbolToIdMapping,
          };
        }
      }
    }

    coinMarketCapIdSet = {
      ...coinMarketCapIdSet,
      ...Object.fromEntries(
        Object.entries(tokensAndCoinmarketcapIdsFromDropdownOptions).filter(
          ([_, tokenData]) => tokenData.vaults?.includes(this.portfolioName),
        ),
      ),
    };
    return coinMarketCapIdSet;
  }
  _getAssetAddressSetByChain() {
    let assetAddressSetByChain = {};
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        if (!assetAddressSetByChain[chain]) {
          assetAddressSetByChain[chain] = new Set();
        }
        for (const protocol of protocols) {
          assetAddressSetByChain[chain].add(protocol.interface.assetAddress);
        }
      }
    }
    return assetAddressSetByChain;
  }

  async getTokenPricesMappingTable() {
    const priceService = new PriceService(process.env.NEXT_PUBLIC_API_URL);
    const batcher = new TokenPriceBatcher(priceService);

    const tokensToFetch = Object.entries(
      this.uniqueTokenIdsForCurrentPrice,
    ).filter(
      ([token]) => !Object.keys(PriceService.STATIC_PRICES).includes(token),
    );

    return await batcher.fetchPrices(tokensToFetch);
  }
  validateStrategyWeights() {
    let totalWeight = 0;
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocolsOnThisChain of Object.values(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocolsOnThisChain) {
          totalWeight += protocol.weight;
        }
      }
    }
    const epsilon = 0.00001; // To account for floating point imprecision
    assert(
      Math.abs(totalWeight - 1) < epsilon,
      `Total weight across all strategies should be 1, but is ${totalWeight}`,
    );
  }
  getFlowChartData(actionName, actionParams) {
    let flowChartData = {
      nodes: [],
      edges: [],
    };
    const chainNodes = [];

    if (actionName === "rebalance") {
      const chainSet = new Set();
      let chainNode;
      let endOfZapOutNodeOnThisChain;
      let middleTokenConfig;
      const zapOutChains =
        actionParams.rebalancableUsdBalanceDict.metadata.rebalanceActionsByChain
          .filter((action) => action.actionName === "rebalance")
          .map((action) => action.chain);
      for (const [key, protocolObj] of Object.entries(
        actionParams.rebalancableUsdBalanceDict,
      )) {
        if (
          key === "pendingRewards" ||
          key === "metadata" ||
          !zapOutChains.includes(protocolObj.chain)
        )
          continue;
        if (protocolObj.weightDiff > this.rebalanceThreshold()) {
          if (!chainSet.has(protocolObj.chain)) {
            chainSet.add(protocolObj.chain);
            chainNode = {
              id: protocolObj.chain,
              name: actionName,
              chain: protocolObj.chain,
              imgSrc: `/chainPicturesWebp/${protocolObj.chain}.webp`,
            };
            endOfZapOutNodeOnThisChain = {
              id: `endOfZapOutOn${protocolObj.chain}`,
              name: "Start Zapping In",
              chain: protocolObj.chain,
              imgSrc: `/chainPicturesWebp/${protocolObj.chain}.webp`,
            };
            chainNodes.push(chainNode);
            flowChartData.nodes.push(endOfZapOutNodeOnThisChain);
            middleTokenConfig = this._getRebalanceMiddleTokenConfig(
              protocolObj.chain,
            );
          }
          const rebalanceRatio =
            protocolObj.weightDiff / protocolObj.positiveWeigtDiffSum;
          const stepsData =
            protocolObj.protocol.interface.getZapOutFlowChartData(
              middleTokenConfig.symbol,
              middleTokenConfig.address,
              rebalanceRatio,
            );
          const currentChainToProtocolNodeEdge = {
            id: `edge-${
              chainNode.id
            }-${protocolObj.protocol.interface.uniqueId()}`,
            source: chainNode.id,
            target: stepsData.nodes[0].id,
            data: {
              ratio: rebalanceRatio,
            },
          };
          const endOfZapOutOfThisProtocolToEndOfZapOutNodeEdge = {
            id: `edge-${
              stepsData.nodes[stepsData.nodes.length - 1].id
            }-endOfZapOut`,
            source: stepsData.nodes[stepsData.nodes.length - 1].id,
            target: endOfZapOutNodeOnThisChain.id,
            data: {
              ratio: rebalanceRatio,
            },
          };
          flowChartData.nodes = flowChartData.nodes.concat(stepsData.nodes);
          flowChartData.edges = flowChartData.edges.concat(
            stepsData.edges.concat([
              currentChainToProtocolNodeEdge,
              endOfZapOutOfThisProtocolToEndOfZapOutNodeEdge,
            ]),
          );
        }
      }
      // Start Zap In
      for (const [key, protocolObj] of Object.entries(
        actionParams.rebalancableUsdBalanceDict,
      )) {
        if (key === "pendingRewards" || key === "metadata") continue;
        if (protocolObj.weightDiff < 0) {
          const zapInRatio =
            -protocolObj.weightDiff / protocolObj.negativeWeigtDiffSum;
          const stepsData =
            protocolObj.protocol.interface.getZapInFlowChartData(
              actionParams.tokenInSymbol,
              actionParams.tokenInAddress,
              zapInRatio,
            );
          if (!chainSet.has(protocolObj.chain)) {
            chainSet.add(protocolObj.chain);
            chainNode = {
              id: protocolObj.chain,
              name: `Bridge to ${protocolObj.chain}`,
              chain: protocolObj.chain,
              imgSrc: `/chainPicturesWebp/${protocolObj.chain}.webp`,
            };
            const bridgeEdge = {
              id: `edge-${endOfZapOutNodeOnThisChain.id}-${chainNode.id}`,
              source: endOfZapOutNodeOnThisChain.id,
              target: chainNode.id,
              data: {
                ratio: zapInRatio,
              },
            };
            chainNodes.push(chainNode);
            flowChartData.edges.push(bridgeEdge);
          }
          const endOfZapOutNodeToZapInNodeEdge = {
            id: `edge-${
              endOfZapOutNodeOnThisChain.id
            }-${protocolObj.protocol.interface.uniqueId()}`,
            source:
              actionParams.chainMetadata.name
                .toLowerCase()
                .replace(" one", "") === protocolObj.chain
                ? endOfZapOutNodeOnThisChain.id
                : protocolObj.chain,
            target: stepsData.nodes[0].id,
            data: {
              ratio: zapInRatio,
            },
          };
          flowChartData.nodes = flowChartData.nodes.concat(stepsData.nodes);
          flowChartData.edges = flowChartData.edges.concat(
            stepsData.edges.concat([endOfZapOutNodeToZapInNodeEdge]),
          );
        }
      }
    } else {
      for (const [category, protocolsInThisCategory] of Object.entries(
        this.strategy,
      )) {
        for (const [chain, protocolsOnThisChain] of Object.entries(
          protocolsInThisCategory,
        )) {
          const chainNode = {
            id: chain,
            name: actionName,
            chain: chain,
            category: category,
            imgSrc: `/chainPicturesWebp/${chain}.webp`,
          };
          chainNodes.push(chainNode);
          for (const protocol of protocolsOnThisChain) {
            let stepsData = [];
            if (protocol.weight === 0) continue;
            if (actionName === "zapIn") {
              stepsData = protocol.interface.getZapInFlowChartData(
                actionParams.tokenInSymbol,
                actionParams.tokenInAddress,
                protocol.weight,
              );
            } else if (actionName === "stake") {
              stepsData = protocol.interface.getStakeFlowChartData();
            } else if (actionName === "transfer") {
              stepsData = protocol.interface.getTransferFlowChartData(
                protocol.weight,
              );
            } else if (actionName === "zapOut") {
              stepsData = protocol.interface.getZapOutFlowChartData(
                actionParams.outputToken,
                actionParams.outputTokenAddress,
                protocol.weight,
              );
            } else {
              throw new Error(`Invalid action name ${actionName}`);
            }
            const currentChainToProtocolNodeEdge = {
              id: `edge-${chainNode.id}-${protocol.interface.uniqueId()}`,
              source: chainNode.id,
              target: stepsData.nodes[0].id,
              data: {
                ratio: protocol.weight,
              },
            };
            flowChartData.nodes = flowChartData.nodes.concat(stepsData.nodes);
            flowChartData.edges = flowChartData.edges.concat(
              stepsData.edges.concat(currentChainToProtocolNodeEdge),
            );
          }
        }
      }
    }
    return {
      nodes: chainNodes.concat(flowChartData.nodes),
      edges: flowChartData.edges,
    };
  }

  async _getSwapFeeTxnsForZapIn(actionParams, platformFee, middleTokenConfig) {
    const normalizedPlatformFeeUsd =
      ethers.utils.formatUnits(platformFee, middleTokenConfig.decimals) *
      actionParams.tokenPricesMappingTable[middleTokenConfig.symbol];
    actionParams.setPlatformFee(-normalizedPlatformFeeUsd);
    const referrer = await this._getReferrer(actionParams.account);
    return this._getPlatformFeeTxns(
      middleTokenConfig.address,
      actionParams.chainMetadata,
      platformFee,
      referrer,
    );
  }

  async _swapFeeTxnsForZapOut(
    owner,
    tokenOutAddress,
    tokenOutSymbol,
    tokenPricesMappingTable,
    zapOutPercentage,
    portfolioUsdBalance,
    chainMetadata,
    setPlatformFee,
  ) {
    const referrer = await this._getReferrer(owner);
    const tokenOutUsdBalance = portfolioUsdBalance * zapOutPercentage;
    const swapFeeUsd = tokenOutUsdBalance * this.swapFeeRate();
    setPlatformFee(-swapFeeUsd);
    const tokenOutDecimals = await getTokenDecimal(
      tokenOutAddress,
      chainMetadata.name.toLowerCase(),
    );
    let platformFee = ethers.utils.parseUnits(
      (swapFeeUsd / tokenPricesMappingTable[tokenOutSymbol]).toFixed(
        tokenOutDecimals,
      ),
      tokenOutDecimals,
    );
    return this._getPlatformFeeTxns(
      tokenOutAddress,
      chainMetadata,
      platformFee,
      referrer,
    );
  }
  _calculateReferralFee(amount) {
    return this.mulReferralFeeRate(amount);
  }
  _prepareTransferTxn(contract, recipient, amount) {
    return prepareContractCall({
      contract,
      method: "transfer",
      params: [recipient, amount],
    });
  }
  async _getReferrer(owner) {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_SDK_API_URL
      }/referral/${owner.toLowerCase()}/referees`,
    );
    const data = await response.json();
    return data.referrer;
  }
  async _updateProgressAndWait(updateProgress, nodeId, tradingLoss) {
    await new Promise((resolve) => {
      updateProgress(nodeId, tradingLoss);
      // Use setTimeout to ensure the state update is queued
      setTimeout(resolve, 30);
    });
  }
  _getPlatformFeeTxns(tokenAddress, chainMetadata, platformFee, referrer) {
    let txns = [];
    const contract = getContract({
      client: THIRDWEB_CLIENT,
      address: tokenAddress,
      chain: chainMetadata,
      abi: ERC20_ABI,
    });
    if (referrer) {
      const referralFee = this._calculateReferralFee(platformFee);
      platformFee = platformFee.sub(referralFee);
      const referralFeeTxn = this._prepareTransferTxn(
        contract,
        referrer,
        referralFee,
      );
      txns.push(referralFeeTxn);
    }
    const swapFeeTxn = this._prepareTransferTxn(
      contract,
      PROTOCOL_TREASURY_ADDRESS,
      platformFee,
    );
    txns.push(swapFeeTxn);
    return txns;
  }
  _wrapNativeToken(tokenSymbol, action, amount, chainMetadata) {
    let wrappedTokenAddress;
    let wrappedTokenSymbol;
    let wrappedTokenABI;
    if (tokenSymbol === "eth") {
      wrappedTokenAddress =
        TOKEN_ADDRESS_MAP.weth[
          chainMetadata.name.toLowerCase().replace(" one", "")
        ];
      wrappedTokenSymbol = "weth";
      wrappedTokenABI = WETH;
    }
    const contract = getContract({
      client: THIRDWEB_CLIENT,
      address: wrappedTokenAddress,
      chain: chainMetadata,
      abi: wrappedTokenABI,
    });
    return [
      prepareContractCall({
        contract,
        method: action,
        ...(action === "deposit"
          ? { value: toWei(ethers.utils.formatEther(amount)) }
          : { params: [amount] }),
      }),
      wrappedTokenAddress,
      wrappedTokenSymbol,
    ];
  }
  mul_with_slippage_in_bignumber_format(amount, slippage) {
    // Convert amount to BigNumber if it isn't already
    const amountBN = ethers.BigNumber.isBigNumber(amount)
      ? amount
      : ethers.BigNumber.from(String(Math.floor(amount)));

    // Convert slippage to basis points (e.g., 0.5% -> 50)
    const slippageBasisPoints = ethers.BigNumber.from(
      String(Math.floor(slippage * 100)),
    );

    // Calculate (amount * (10000 - slippageBasisPoints)) / 10000
    return amountBN
      .mul(ethers.BigNumber.from(String(10000)).sub(slippageBasisPoints))
      .div(10000);
  }
}
