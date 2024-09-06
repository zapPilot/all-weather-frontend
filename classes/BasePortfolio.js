import { tokensAndCoinmarketcapIdsFromDropdownOptions } from "../utils/contractInteractions";
import assert from "assert";
import { oneInchAddress } from "../utils/oneInch";
import axios from "axios";
import { ethers } from "ethers";
import { getTokenDecimal, approve } from "../utils/general";
export class BasePortfolio {
  constructor(strategy, weightMapping) {
    this.strategy = strategy;
    this.portfolioAPR = {};
    this.existingInvestmentPositions = {};
    this.assetAddressSetByChain = this._getAssetAddressSetByChain();
    this.uniqueTokenIdsForCurrentPrice =
      this._getUniqueTokenIdsForCurrentPrice();
    this.weightMapping = weightMapping;
  }
  async initialize() {
    this.existingInvestmentPositions =
      await this._getExistingInvestmentPositionsByChain(
        account.address,
        updateProgress,
      );
  }
  description() {
    throw new Error("Method 'description()' must be implemented.");
  }
  async usdBalanceOf(address) {
    const tokenPricesMappingTable = await this._getTokenPricesMappingTable(
      () => {},
    );

    let usdBalance = 0;
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocolsInThisChain of Object.values(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocolsInThisChain) {
          if (protocol.weight === 0) continue;
          const balance = await protocol.interface.usdBalanceOf(
            address,
            tokenPricesMappingTable,
          );
          usdBalance += balance;
        }
      }
    }
    return usdBalance;
  }
  async pendingRewards(owner, updateProgress) {
    const tokenPricesMappingTable =
      await this._getTokenPricesMappingTable(updateProgress);

    let rewardsMappingTable = {};
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocolsInThisChain of Object.values(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocolsInThisChain) {
          if (protocol.weight === 0) continue;
          const rewards = await protocol.interface.pendingRewards(
            owner,
            tokenPricesMappingTable,
            updateProgress,
          );
          for (const [tokenAddress, rewardMetadata] of Object.entries(
            rewards,
          )) {
            if (!rewardsMappingTable[tokenAddress]) {
              rewardsMappingTable[tokenAddress] = {};
            }
            rewardsMappingTable[tokenAddress]["balance"] = (
              rewardsMappingTable[tokenAddress]["balance"] ||
              ethers.BigNumber.from(0)
            ).add(rewardMetadata.balance);
            rewardsMappingTable[tokenAddress]["usdDenominatedValue"] =
              (rewardsMappingTable[tokenAddress]["usdDenominatedValue"] || 0) +
              rewardMetadata.usdDenominatedValue;
            rewardsMappingTable[tokenAddress]["decimals"] =
              rewardMetadata.decimals;
            rewardsMappingTable[tokenAddress]["symbol"] = rewardMetadata.symbol;
          }
        }
      }
    }
    return rewardsMappingTable;
  }
  async getPortfolioMetadata() {
    let aprMappingTable = {};
    const allProtocols = Object.values(this.strategy).flatMap((protocols) =>
      Object.entries(protocols).flatMap(([chain, protocolArray]) =>
        protocolArray.map((protocol) => ({ chain, protocol })),
      ),
    );
    let totalTvl = 0;
    await Promise.all(
      allProtocols.map(async ({ chain, protocol }) => {
        const poolUniqueKey = protocol.interface.uniqueId();
        const url = `${process.env.NEXT_PUBLIC_API_URL}/pool/${poolUniqueKey}/apr`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          aprMappingTable[poolUniqueKey] = {
            apr: data.value,
            weight: protocol.weight,
            tvl: data.tvl,
          };
          totalTvl += data.tvl;
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
    aprMappingTable["portfolioTVL"] = totalTvl
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return aprMappingTable;
  }
  async getExistingInvestmentPositions() {
    throw new Error(
      "Method 'getExistingInvestmentPositions()' must be implemented.",
    );
  }

  async portfolioAction(actionName, actionParams) {
    let completedSteps = 0;
    const totalSteps =
      this._countProtocolStepsWithThisAction(actionName) +
      Object.keys(this.uniqueTokenIdsForCurrentPrice).length +
      Object.keys(this.assetAddressSetByChain).length;
    const updateProgress = (actionName) => {
      completedSteps++;
      actionParams.progressCallback(
        (completedSteps / totalSteps) * 100 > 100
          ? 100
          : (completedSteps / totalSteps) * 100,
      );
      actionParams.progressStepNameCallback(actionName);
    };
    const tokenPricesMappingTable =
      await this._getTokenPricesMappingTable(updateProgress);
    actionParams.tokenPricesMappingTable = tokenPricesMappingTable;
    actionParams.updateProgress = updateProgress;
    return await this._generateTxnsByAction(actionName, actionParams);
  }
  async getTokenPricesMappingTable() {
    throw new Error(
      "Method 'getTokenPricesMappingTable()' must be implemented.",
    );
  }
  async _generateTxnsByAction(actionName, actionParams) {
    let totalTxns = [];
    if (actionName === "zapIn") {
      // TODO(david): zap in's weight should take protocolUsdBalanceDictionary into account
      // protocolUsdBalanceDictionary = await this._getProtocolUsdBalanceDictionary(owner)
      const inputTokenDecimal = await getTokenDecimal(
        actionParams.tokenInAddress,
      );
      const approveTxn = approve(
        actionParams.tokenInAddress,
        oneInchAddress,
        ethers.utils.parseUnits(
          actionParams.zapInAmount.toFixed(inputTokenDecimal),
          inputTokenDecimal,
        ),
        actionParams.updateProgress,
      );
      totalTxns.push(approveTxn);
    } else if (actionName === "rebalance") {
      return await this._generateRebalanceTxns(
        actionParams.account,
        actionParams.slippage,
        actionParams.tokenPricesMappingTable,
        actionParams.updateProgress,
      );
    }
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocols) {
          const protocolUsdBalance = await protocol.interface.usdBalanceOf(
            actionParams.account,
          );
          if (protocol.weight === 0) {
            continue;
          }
          // make it concurrent!
          let txnsForThisProtocol;
          if (actionName === "zapIn") {
            txnsForThisProtocol = await protocol.interface.zapIn(
              actionParams.account,
              Number(actionParams.zapInAmount * protocol.weight),
              actionParams.tokenInSymbol,
              actionParams.tokenInAddress,
              actionParams.slippage,
              actionParams.tokenPricesMappingTable,
              actionParams.updateProgress,
              this.existingInvestmentPositions[chain],
            );
          } else if (actionName === "zapOut" && protocolUsdBalance > 0.01) {
            txnsForThisProtocol = await protocol.interface.zapOut(
              actionParams.account,
              Number(actionParams.zapOutPercentage),
              actionParams.tokenOutAddress,
              actionParams.slippage,
              actionParams.tokenPricesMappingTable,
              actionParams.updateProgress,
              this.existingInvestmentPositions[chain],
            );
          } else if (actionName === "claimAndSwap") {
            txnsForThisProtocol = await protocol.interface.claimAndSwap(
              actionParams.account,
              actionParams.tokenOutAddress,
              actionParams.slippage,
              actionParams.tokenPricesMappingTable,
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

  async _generateRebalanceTxns(
    owner,
    slippage,
    tokenPricesMappingTable,
    updateProgress,
  ) {
    // rebalace workflow:

    // 1. get all of the current balance
    // 2. calculate the best routes
    //     1. use this.assetContract.address to compare with the desire allocation -> return a difference dictionary
    //     2. calculate the routes for rebalancing
    // 3. implement each other protocol's rebalance() function
    //     1. if the asset address is the same,
    // 4. pass routes data to each protocol's rebalance(), who's usd balance > threshold

    // easier one:
    // 1. zap out all of the protocol who's weight is 0
    // 2. call zapIn function again.
    // let protocolUsdBalanceDictionary = await this._getProtocolUsdBalanceDictionary(owner)
    let txns = [];
    // TODO(david): zap out to USDC might not be the best route
    // but it's enough for now
    let zapOutUsdcBalance = 0;
    const usdcSymbol = "usdc";
    const usdcAddressInThisChain = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocols) {
          if (protocol.weight !== 0) continue;
          const usdBalance = await protocol.interface.usdBalanceOf(owner);
          if (usdBalance === 0) continue;
          const zapOutTxn = await protocol.interface.zapOut(
            owner,
            1,
            usdcAddressInThisChain,
            slippage,
            tokenPricesMappingTable,
            updateProgress,
            {},
            this.existingInvestmentPositions[chain],
          );
          txns.push(zapOutTxn);
          zapOutUsdcBalance += (usdBalance * (100 - slippage)) / 100;
        }
      }
    }
    return txns.concat(
      await this._generateTxnsByAction("zapIn", {
        account: owner,
        tokenInSymbol: usdcSymbol,
        tokenInAddress: usdcAddressInThisChain,
        zapInAmount: zapOutUsdcBalance,
        slippage,
        tokenPricesMappingTable,
        updateProgress,
      }),
    );
  }

  async _getProtocolUsdBalanceDictionary(owner) {
    let existingPositions = {};
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocols) {
          if (protocol.weight === 0) continue;
          const protocolUsdBalance =
            await protocol.interface.usdBalanceOf(owner);
          if (existingPositions[chain] === undefined) {
            existingPositions[chain] = {};
          }
          existingPositions[chain][protocol.interface.assetContract.address] =
            protocolUsdBalance;
        }
      }
    }
    return existingPositions;
  }

  async _calProtocolAssetDustInWalletDictionary(owner) {
    let result = {};
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocols) {
          const assetBalance = await protocol.interface.assetBalanceOf(owner);
          if (result[chain] === undefined) {
            result[chain] = {};
          }
          result[chain][protocol.interface.assetContract.address] =
            assetBalance;
          // result[protocol.interface.assetContract.address] = assetBalance
        }
      }
    }
    return result;
  }
  _calRebalanceRoutes(
    sortedPositions,
    totalUsdBalance,
    protocolAssetDustInWalletDictionary,
  ) {}
  async _getExistingInvestmentPositionsByChain(address, updateProgress) {
    let existingInvestmentPositionsbyChain = {};
    for (const [chain, lpTokens] of Object.entries(
      this.assetAddressSetByChain,
    )) {
      updateProgress(`Fetching ${chain}\'s investment positions: ${lpTokens}`);
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/${address}/nft/tvl_highest?token_addresses=${Array.from(
          lpTokens,
        ).join("+")}&chain=${chain}`,
      );
      const data = await response.json();
      existingInvestmentPositionsbyChain[chain] = data;
    }
    return existingInvestmentPositionsbyChain;
  }

  _getUniqueTokenIdsForCurrentPrice() {
    let coinMarketCapIdSet = {};
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocols of Object.values(protocolsInThisCategory)) {
        for (const protocol of protocols) {
          const apiSymbolToIdMapping = Object.values(
            protocol.interface.rewards(),
          )
            .flatMap((tokenArray) =>
              Array.isArray(tokenArray) ? tokenArray : [],
            )
            .reduce((idMapping, token) => {
              if (token.coinmarketcapApiId !== undefined) {
                idMapping[token.symbol] = token.coinmarketcapApiId;
              }
              return idMapping;
            }, {});
          coinMarketCapIdSet = {
            ...coinMarketCapIdSet,
            ...apiSymbolToIdMapping,
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
      updateProgress(`Fetching price for ${token}`);
      axios
        .get(
          `${process.env.NEXT_PUBLIC_API_URL}/token/${coinMarketCapId}/price`,
        )
        .then((result) => {
          tokenPricesMappingTable[token] = result.data.price;
        });
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
  _countProtocolStepsWithThisAction(actionName) {
    let counts = 0;
    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const protocolsInThisChain of Object.values(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocolsInThisChain) {
          if (protocol.weight === 0) continue;
          if (actionName === "zapIn") {
            counts += protocol.interface.zapInSteps();
          } else if (actionName === "zapOut") {
            counts += protocol.interface.zapOutSteps();
          } else if (actionName === "claimAndSwap") {
            counts += protocol.interface.claimAndSwapSteps();
          } else if (actionName === "rebalance") {
            counts +=
              protocol.interface.rebalanceSteps() +
              protocol.interface.zapInSteps();
          } else {
            throw new Error(`Action ${actionName} not supported`);
          }
        }
      }
    }
    return counts;
  }
}
