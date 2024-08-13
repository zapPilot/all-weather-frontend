import { tokensAndCoinmarketcapIdsFromDropdownOptions } from "../utils/contractInteractions";
import assert from "assert";
import { oneInchAddress } from "../utils/oneInch";
import axios from "axios";
import { getTokenDecimal, approve } from "../utils/general";
export class BasePortfolio {
  constructor(strategy) {
    this.strategy = strategy;
    this.portfolioAPR = {};
    this.existingInvestmentPositions = {};
    this.tokenPricesMappingTable = {};
    this.assetAddressSetByChain = this._getAssetAddressSetByChain();
    this.uniqueTokenIdsForCurrentPrice =
      this._getUniqueTokenIdsForCurrentPrice();

    this.weightMapping = {
      // example:
      //   long_term_bond: 0,
      //   intermediate_term_bond: 0.25 * 2,
      //   commodities: 0.1 * 2,
      //   gold: 0.1 * 2,
      //   large_cap_us_stocks: 0.12 * 2,
      //   small_cap_us_stocks: 0.01 * 2,
      //   non_us_developed_market_stocks: 0.02 * 2,
      //   non_us_emerging_market_stocks: 0.01 * 2,
    };
  }
  async initialize() {
    this.existingInvestmentPositions =
      await this._getExistingInvestmentPositionsByChain(
        account.address,
        updateProgress,
      );
  }
  async getPortfolioAPR() {
    throw new Error("Method 'getPortfolioAPR()' must be implemented.");
  }
  reuseFetchedDataFromRedux(slice) {
    // get strategyMetadata data directly from the redux store. So that we don't need to run `initialize` function again
    // this data is for SunBurst chart to visualize the data
    this.portfolioAPR = slice;
  }
  async getExistingInvestmentPositions() {
    throw new Error(
      "Method 'getExistingInvestmentPositions()' must be implemented.",
    );
  }
  reuseExistingInvestmentPositionsFromRedux(slice) {
    // get strategyMetadata data directly from the redux store. So that we don't need to run `initialize` function again
    // this data is for SunBurst chart to visualize the data
    this.existingInvestmentPositions = slice;
  }
  async getTokenPricesMappingTable() {
    throw new Error(
      "Method 'getTokenPricesMappingTable()' must be implemented.",
    );
  }
  async zapIn(
    account,
    tokenSymbol,
    tokenAddress,
    investmentAmount,
    progressCallback,
    slippage,
  ) {
    let completedSteps = 0;
    const totalSteps =
      this._countProtocolNumber() +
      Object.keys(this.uniqueTokenIdsForCurrentPrice).length +
      Object.keys(this.assetAddressSetByChain).length;
    const updateProgress = () => {
      completedSteps++;
      progressCallback((completedSteps / totalSteps) * 100);
    };
    const tokenPricesMappingTable =
      await this._getTokenPricesMappingTable(updateProgress);
    const txns = await this._generateZapInTxns(
      account,
      investmentAmount,
      tokenSymbol,
      tokenAddress,
      slippage,
      updateProgress,
      tokenPricesMappingTable,
    );
    return txns;
  }
  async zapOut(
    account,
    tokenOutSymbol,
    tokenOutAddress,
    zapOutPercentage,
    progressCallback,
    slippage,
  ) {
    let completedSteps = 0;
    const totalSteps =
      this._countProtocolNumber() +
      Object.keys(this.uniqueTokenIdsForCurrentPrice).length +
      Object.keys(this.assetAddressSetByChain).length;
    const updateProgress = () => {
      completedSteps++;
      progressCallback((completedSteps / totalSteps) * 100);
    };
    const tokenPricesMappingTable =
      await this._getTokenPricesMappingTable(updateProgress);
    const txns = await this._generateZapOutTxns(
      account,
      zapOutPercentage,
      tokenOutSymbol,
      tokenOutAddress,
      slippage,
      updateProgress,
      tokenPricesMappingTable,
    );
    return txns;
  }
  async rebalance() {
    throw new Error("Method 'rebalance()' must be implemented.");
  }
  async portfolioAction(actionName, actionParams) {
    let completedSteps = 0;
    const totalSteps =
      this._countProtocolNumber() +
      Object.keys(this.uniqueTokenIdsForCurrentPrice).length +
      Object.keys(this.assetAddressSetByChain).length;
    const updateProgress = () => {
      completedSteps++;
      actionParams.progressCallback((completedSteps / totalSteps) * 100);
    };
    const tokenPricesMappingTable =
      await this._getTokenPricesMappingTable(updateProgress);
    let txns;
    if (actionName === "zapIn") {
    } else if (actionName === "zapOut") {
    } else if (actionName === "rebalance") {
    } else if (actionName === "claimAndSwap") {
      txns = await this._generateClaimAndSwapTxns(
        actionParams.account,
        actionParams.tokenOutAddress,
        actionParams.slippage,
        updateProgress,
      );
    }
    return txns;
  }
  async _generateZapInTxns(
    account,
    investmentAmount,
    tokenSymbol,
    tokenAddress,
    slippage,
    updateProgress,
    tokenPricesMappingTable,
  ) {
    let totalTxns = [];
    const inputTokenDecimal = await getTokenDecimal(tokenAddress);
    const approveTxn = approve(
      tokenAddress,
      oneInchAddress,
      investmentAmount,
      inputTokenDecimal,
      updateProgress,
    );
    totalTxns.push(approveTxn);
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocols) {
          // make it concurrent!
          const txnsForThisProtocol = await protocol.interface.zapIn(
            account.address,
            Number(investmentAmount * protocol.weight),
            tokenSymbol,
            tokenAddress,
            slippage,
            this.existingInvestmentPositions[chain],
            tokenPricesMappingTable,
            updateProgress,
          );
          totalTxns = totalTxns.concat(txnsForThisProtocol);
        }
      }
    }
    return totalTxns;
  }

  async _generateZapOutTxns(
    account,
    zapOutPercentage,
    tokenOutSymbol,
    tokenOutAddress,
    slippage,
    updateProgress,
    tokenPricesMappingTable,
  ) {
    let totalTxns = [];
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocols) {
          // TODO: make it concurrent!
          const txnsForThisProtocol = await protocol.interface.zapOut(
            account.address,
            Number(zapOutPercentage * protocol.weight),
            tokenOutAddress,
            slippage,
            tokenPricesMappingTable,
            updateProgress,
            {
              existingInvestmentPositions:
                this.existingInvestmentPositions[chain],
            },
          );
          totalTxns = totalTxns.concat(txnsForThisProtocol);
        }
      }
    }
    return totalTxns;
  }
  async _generateClaimAndSwapTxns(
    account,
    tokenOutAddress,
    slippage,
    updateProgress,
  ) {
    let totalTxns = [];
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocols) {
          // TODO: make it concurrent!
          const txnsForThisProtocol = await protocol.interface.claimAndSwap(
            account.address,
            tokenOutAddress,
            slippage,
            updateProgress,
          );
          totalTxns = totalTxns.concat(txnsForThisProtocol);
        }
      }
    }
    return totalTxns;
  }

  async _getExistingInvestmentPositionsByChain(address, updateProgress) {
    let existingInvestmentPositionsbyChain = {};
    for (const [chain, lpTokens] of Object.entries(
      this.assetAddressSetByChain,
    )) {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/${address}/nft/tvl_highest?token_addresses=${Array.from(
          lpTokens,
        ).join("+")}&chain=${chain}`,
      );
      const data = await response.json();
      existingInvestmentPositionsbyChain[chain] = data;
      updateProgress();
    }
    return existingInvestmentPositionsbyChain;
  }

  _getUniqueTokenIdsForCurrentPrice() {
    let coinMarketCapIdSet = {};
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocols of Object.values(protocolsInThisCategory)) {
        for (const protocol of protocols) {
          coinMarketCapIdSet = {
            ...coinMarketCapIdSet,
            ...protocol.interface.token2TokenIdMapping,
          };
        }
      }
    }
    coinMarketCapIdSet = {
      ...coinMarketCapIdSet,
      ...tokensAndCoinmarketcapIdsFromDropdownOptions,
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
  async _getTokenPricesMappingTable(updateProgress) {
    let tokenPricesMappingTable = {};
    for (const [token, coinMarketCapId] of Object.entries(
      this.uniqueTokenIdsForCurrentPrice,
    )) {
      axios
        .get(
          `${process.env.NEXT_PUBLIC_API_URL}/token/${coinMarketCapId}/price`,
        )
        .then((result) => {
          tokenPricesMappingTable[token] = result.data.price;
        });
      updateProgress();
    }
    return tokenPricesMappingTable;
  }
  validateStrategyWeights() {
    let totalWeight = 0;
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocolsInThisChain of Object.values(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocolsInThisChain) {
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
  _countProtocolNumber() {
    let counts = 0;
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocolsInThisChain of Object.values(
        protocolsInThisCategory,
      )) {
        counts += protocolsInThisChain.length;
      }
    }
    return counts;
  }
}
