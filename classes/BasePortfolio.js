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
  async getClaimableRewards() {
    throw new Error("Method 'getClaimableRewards()' must be implemented.");
  }
  async getPortfolioAPR() {
    let aprMappingTable = {};
    const allProtocols = Object.values(this.strategy).flatMap((protocols) =>
      Object.entries(protocols).flatMap(([chain, protocolArray]) =>
        protocolArray.map((protocol) => ({ chain, protocol })),
      ),
    );
    await Promise.all(
      allProtocols.map(async ({ chain, protocol }) => {
        console.log("symbolList: ", protocol.interface.symbolList);
        // const symbolList = protocol.interface.symbolList.join("+");
        const sortedSymbolList = protocol.interface.symbolList.sort().join("-");
        const poolUniqueKey = `${chain}/${protocol.interface.protocolName}/${protocol.interface.protocolVersion}/${sortedSymbolList}`;
        const url = `${process.env.NEXT_PUBLIC_API_URL}/pool/${poolUniqueKey}/apr`;
        console.log("url", url);
        try {
          const response = await fetch(url);
          const data = await response.json();
          aprMappingTable[poolUniqueKey] = {
            apr: data.value,
            weight: protocol.weight,
          };
        } catch (error) {
          console.error(`Error fetching data for ${url}:`, error);
          return null;
        }
      }),
    );
    aprMappingTable["portfolioAPR"] = Object.values(aprMappingTable).reduce(
      (sum, pool) => sum + pool.apr * pool.weight,
      0,
    );
    return aprMappingTable;
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
    actionParams.tokenPricesMappingTable = tokenPricesMappingTable;
    actionParams.updateProgress = updateProgress;
    return this._generateTxnsByAction(actionName, actionParams);
  }
  async getTokenPricesMappingTable() {
    throw new Error(
      "Method 'getTokenPricesMappingTable()' must be implemented.",
    );
  }
  async _generateTxnsByAction(actionName, actionParams) {
    let totalTxns = [];
    if (actionName === "zapIn") {
      const inputTokenDecimal = await getTokenDecimal(
        actionParams.tokenInAddress,
      );
      const approveTxn = approve(
        actionParams.tokenInAddress,
        oneInchAddress,
        actionParams.zapInAmount,
        inputTokenDecimal,
        actionParams.updateProgress,
      );
      totalTxns.push(approveTxn);
    }
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocols) {
          // make it concurrent!
          let txnsForThisProtocol;
          if (actionName === "zapIn") {
            txnsForThisProtocol = await protocol.interface.zapIn(
              actionParams.account.address,
              Number(actionParams.zapInAmount * protocol.weight),
              actionParams.tokenInSymbol,
              actionParams.tokenInAddress,
              actionParams.slippage,
              actionParams.tokenPricesMappingTable,
              actionParams.updateProgress,
              this.existingInvestmentPositions[chain],
            );
          } else if (actionName === "zapOut") {
            txnsForThisProtocol = await protocol.interface.zapOut(
              actionParams.account.address,
              Number(actionParams.zapOutPercentage * protocol.weight),
              actionParams.tokenOutAddress,
              actionParams.slippage,
              actionParams.tokenPricesMappingTable,
              actionParams.updateProgress,
              this.existingInvestmentPositions[chain],
            );
          } else if (actionName === "rebalance") {
            throw new Error("Method 'rebalance()' must be implemented.");
          } else if (actionName === "claimAndSwap") {
            txnsForThisProtocol = await protocol.interface.claimAndSwap(
              actionParams.account.address,
              actionParams.tokenOutAddress,
              actionParams.slippage,
              actionParams.updateProgress,
              this.existingInvestmentPositions[chain],
            );
          }
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
