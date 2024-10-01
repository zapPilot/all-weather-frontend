import { tokensAndCoinmarketcapIdsFromDropdownOptions } from "../utils/contractInteractions";
import assert from "assert";
import { oneInchAddress } from "../utils/oneInch";
import axios from "axios";
import { getTokenDecimal, approve } from "../utils/general";
import { ethers } from "ethers";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../utils/thirdweb";
import { arbitrum } from "thirdweb/chains";
import ERC20_ABI from "../lib/contracts/ERC20.json" assert { type: "json" };

const PROTOCOL_TREASURY_ADDRESS = "0x2eCBC6f229feD06044CDb0dD772437a30190CD50";
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
  denomination() {
    throw new Error("Method 'denomination()' must be implemented.");
  }
  lockUpPeriod() {
    throw new Error("Method 'lockUpPeriod()' must be implemented.");
  }
  async usdBalanceOf(address) {
    const tokenPricesMappingTable = await this.getTokenPricesMappingTable(
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
    const pendingRewards = await this.pendingRewards(address, () => {});
    return usdBalance + this.sumUsdDenominatedValues(pendingRewards);
  }
  async pendingRewards(owner, updateProgress) {
    const tokenPricesMappingTable =
      await this.getTokenPricesMappingTable(updateProgress);

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
    aprMappingTable["portfolioTVL"] = (totalTvl / 1000000)
      .toFixed(2)
      .concat("M");
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
      await this.getTokenPricesMappingTable(updateProgress);
    actionParams.tokenPricesMappingTable = tokenPricesMappingTable;
    actionParams.updateProgress = updateProgress;
    return await this._generateTxnsByAction(actionName, actionParams);
  }

  async _generateTxnsByAction(actionName, actionParams) {
    let totalTxns = [];
    if (actionName === "zapIn") {
      // TODO(david): zap in's weight should take protocolUsdBalanceDictionary into account
      // protocolUsdBalanceDictionary = await this._getProtocolUsdBalanceDictionary(owner)
      const transferAmount = this.mulSwapFeeRate(actionParams.zapInAmount);
      actionParams.zapInAmount = actionParams.zapInAmount.sub(transferAmount);
      const approveTxn = approve(
        actionParams.tokenInAddress,
        oneInchAddress,
        actionParams.zapInAmount,
        actionParams.updateProgress,
      );
      const swapFeeTxn = prepareContractCall({
        contract: getContract({
          client: THIRDWEB_CLIENT,
          address: actionParams.tokenInAddress,
          chain: arbitrum,
          abi: ERC20_ABI,
        }),
        method: "transfer",
        params: [PROTOCOL_TREASURY_ADDRESS, transferAmount],
      });
      totalTxns = totalTxns.concat([approveTxn, swapFeeTxn]);
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
          if (protocol.weight === 0) {
            continue;
          }
          // make it concurrent!
          let txnsForThisProtocol;
          if (actionName === "zapIn") {
            const percentageBN = ethers.BigNumber.from(
              Math.floor(protocol.weight * 10000),
            );
            txnsForThisProtocol = await protocol.interface.zapIn(
              actionParams.account,
              actionParams.zapInAmount.mul(percentageBN).div(10000),
              actionParams.tokenInSymbol,
              actionParams.tokenInAddress,
              actionParams.slippage,
              actionParams.tokenPricesMappingTable,
              actionParams.updateProgress,
              this.existingInvestmentPositions[chain],
            );
          } else if (actionName === "zapOut") {
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
          if (!txnsForThisProtocol) {
            continue;
          }
          totalTxns = totalTxns.concat(txnsForThisProtocol);
        }
      }
    }
    if (actionName === "zapOut") {
      totalTxns.push(
        await this._swapFeeTxnForZapOut(
          actionParams.account,
          actionParams.tokenOutAddress,
          actionParams.tokenOutSymbol,
          actionParams.tokenPricesMappingTable,
          actionParams.zapOutPercentage,
        ),
      );
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
          const usdBalance = await protocol.interface.usdBalanceOf(
            owner,
            tokenPricesMappingTable,
          );
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
          let apiSymbolToIdMapping = {};
          for (const reward of protocol.interface.rewards()) {
            apiSymbolToIdMapping[reward.symbol] = reward.coinmarketcapApiId;
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
  async getTokenPricesMappingTable(updateProgress) {
    let tokenPricesMappingTable = {
      usdc: 1,
      usdt: 1,
      dai: 1,
      frax: 1,
    };
    for (const [token, coinMarketCapId] of Object.entries(
      this.uniqueTokenIdsForCurrentPrice,
    )) {
      updateProgress(`Fetching price for ${token}`);
      if (["usdc", "usdt", "dai", "frax"].includes(token)) continue;
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
  async _swapFeeTxnForZapOut(
    userAddress,
    tokenOutAddress,
    tokenOutSymbol,
    tokenPricesMappingTable,
    zapOutPercentage,
  ) {
    const portfolioUsdBalance = await this.usdBalanceOf(userAddress);
    const tokenOutUsdBalance = portfolioUsdBalance * zapOutPercentage;
    const swapFeeUsd = tokenOutUsdBalance * this.swapFeeRate();
    const tokenOutDecimals = await getTokenDecimal(tokenOutAddress);
    const swapFeeBalance = ethers.utils.parseUnits(
      (swapFeeUsd / tokenPricesMappingTable[tokenOutSymbol]).toFixed(
        tokenOutDecimals,
      ),
      tokenOutDecimals,
    );
    const swapFeeTxn = prepareContractCall({
      contract: getContract({
        client: THIRDWEB_CLIENT,
        address: tokenOutAddress,
        chain: arbitrum,
        abi: ERC20_ABI,
      }),
      method: "transfer",
      params: [PROTOCOL_TREASURY_ADDRESS, swapFeeBalance],
    });
    return swapFeeTxn;
  }
}
