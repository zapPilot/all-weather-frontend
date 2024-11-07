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
import ReactMarkdown from "react-markdown";
const PROTOCOL_TREASURY_ADDRESS = "0x2eCBC6f229feD06044CDb0dD772437a30190CD50";
const REWARD_SLIPPAGE = 0.8;
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
          if (typeof protocol.lockUpPeriod !== "function") {
            throw new Error("Method 'lockUpPeriod()' must be implemented.");
          }
          const lockUpPeriod = await protocol.lockUpPeriod(address);
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
    const tokenPricesMappingTable = await this.getTokenPricesMappingTable(
      () => {},
    );

    // Flatten the strategy structure and create balance calculation promises
    const balancePromises = Object.values(this.strategy)
      .flatMap((category) => Object.values(category))
      .flat()
      .map((protocol) =>
        protocol.interface
          .usdBalanceOf(address, tokenPricesMappingTable)
          .then((balance) => ({ protocol, balance })),
      );

    // Add the pending rewards promise
    const pendingRewardsPromise = this.pendingRewards(address, () => {}).then(
      (pendingRewards) => ({
        rewardUsdBalance: this.sumUsdDenominatedValues(pendingRewards),
        pendingRewardsDict: pendingRewards,
      }),
    );

    // Wait for all promises to resolve
    const [balanceResults, { rewardUsdBalance, pendingRewardsDict }] =
      await Promise.all([Promise.all(balancePromises), pendingRewardsPromise]);
    let usdBalance = rewardUsdBalance;
    const usdBalanceDict = {
      pendingRewards: {
        usdBalance: rewardUsdBalance,
        weightDiff: 1,
        pendingRewardsDict,
        weight: 0,
        APR: 0,
        currentWeight: 0,
      },
    };

    // Process balance results
    for (const { protocol, balance } of balanceResults) {
      usdBalance += balance;
      const protocolUniqueId =
        protocol.interface.uniqueId() + protocol.interface.constructor.name;
      usdBalanceDict[protocolUniqueId] = {
        usdBalance: balance,
        weight: protocol.weight,
        symbol: protocol.interface.symbolList,
        protocol: protocol,
        zapOutPercentage: protocol.weight === 0 ? 1 : undefined,
        APR: portfolioAprDict?.[protocol.interface.uniqueId()]?.apr * 100,
      };
    }

    // Calculate weight differences
    let negativeWeigtDiffSum = 0;
    for (const [protocolUniqueId, data] of Object.entries(usdBalanceDict)) {
      if (protocolUniqueId !== "pendingRewards") {
        const currentWeight = isNaN(data.usdBalance)
          ? 0
          : data.usdBalance / usdBalance;
        data.weightDiff = currentWeight - data.weight;
        data.currentWeight = currentWeight;
        if (data.weightDiff > this.rebalanceThreshold()) {
          data.zapOutPercentage =
            ((currentWeight - data.weight) * usdBalance) / data.usdBalance;
        }
        if (data.weightDiff < 0) {
          negativeWeigtDiffSum += data.weightDiff;
        }
      }
    }
    for (const data of Object.values(usdBalanceDict)) {
      if (negativeWeigtDiffSum < 0) {
        data.negativeWeigtDiffSum = Math.abs(negativeWeigtDiffSum);
      }
    }
    return [usdBalance, usdBalanceDict];
  }
  async pendingRewards(owner, updateProgress) {
    const tokenPricesMappingTable =
      await this.getTokenPricesMappingTable(updateProgress);

    // Flatten the strategy structure and create pending rewards calculation promises
    const rewardsPromises = Object.values(this.strategy)
      .flatMap((category) => Object.values(category))
      .flat()
      .filter((protocol) => protocol.weight !== 0)
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
          acc[tokenAddress] = {
            balance: ethers.BigNumber.from(0),
            usdDenominatedValue: 0,
            decimals: rewardMetadata.decimals,
            symbol: rewardMetadata.symbol,
          };
        }
        acc[tokenAddress].balance = acc[tokenAddress].balance.add(
          rewardMetadata.balance,
        );
        acc[tokenAddress].usdDenominatedValue +=
          rewardMetadata.usdDenominatedValue;
      }
      return acc;
    }, {});

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

    const totalTvl = Object.values(aprMappingTable).reduce(
      (sum, pool) => sum + pool.tvl,
      0,
    );

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
    let portfolioUsdBalance = 0;
    if (actionName === "zapIn") {
      // TODO(david): zap in's weight should take protocolUsdBalanceDictionary into account
      // protocolUsdBalanceDictionary = await this._getProtocolUsdBalanceDictionary(owner)
      const approveTxn = approve(
        actionParams.tokenInAddress,
        oneInchAddress,
        actionParams.zapInAmount,
        actionParams.updateProgress,
      );
      totalTxns = totalTxns.concat([approveTxn]);
    } else if (actionName === "rebalance") {
      return await this._generateRebalanceTxns(
        actionParams.account,
        actionParams.slippage,
        actionParams.tokenPricesMappingTable,
        actionParams.updateProgress,
        actionParams.rebalancableUsdBalanceDict,
      );
    } else if (actionName === "zapOut") {
      portfolioUsdBalance = (await this.usdBalanceOf(actionParams.account))[0];
      if (portfolioUsdBalance === 0) {
        return [];
      }
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
            const protocolUsdBalance = await protocol.interface.usdBalanceOf(
              actionParams.account,
              actionParams.tokenPricesMappingTable,
            );
            if (protocolUsdBalance === 0) continue;
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
      totalTxns = totalTxns.concat(
        await this._swapFeeTxnsForZapOut(
          actionParams.account,
          actionParams.tokenOutAddress,
          actionParams.tokenOutSymbol,
          actionParams.tokenPricesMappingTable,
          actionParams.zapOutPercentage,
          portfolioUsdBalance,
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
    rebalancableUsdBalanceDict,
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
          const usdBalance = await protocol.interface.usdBalanceOf(
            owner,
            tokenPricesMappingTable,
          );
          const protocolClassName =
            protocol.interface.uniqueId() + protocol.interface.constructor.name;
          let zapOutPercentage;
          if (usdBalance === 0) continue;
          if (
            rebalancableUsdBalanceDict[protocolClassName]?.zapOutPercentage > 0
          ) {
            zapOutPercentage =
              rebalancableUsdBalanceDict[protocolClassName].zapOutPercentage;
          } else {
            continue;
          }
          const zapOutTxns = await protocol.interface.zapOut(
            owner,
            zapOutPercentage,
            usdcAddressInThisChain,
            slippage,
            tokenPricesMappingTable,
            updateProgress,
            {},
            this.existingInvestmentPositions[chain],
          );
          txns = txns.concat(zapOutTxns);
          zapOutUsdcBalance +=
            (usdBalance * zapOutPercentage * (100 - slippage)) / 100;
        }
      }
    }
    const zapInAmount = ethers.utils.parseUnits(
      (
        (zapOutUsdcBalance * (100 - slippage)) / 100 +
        rebalancableUsdBalanceDict.pendingRewards.usdBalance * REWARD_SLIPPAGE
      ).toFixed(6),
      6,
    );
    const approveTxn = approve(
      usdcAddressInThisChain,
      oneInchAddress,
      zapInAmount,
      () => {},
    );
    const transferAmount = this.mulSwapFeeRate(zapInAmount);
    const zapInAmountAfterFee = zapInAmount.sub(transferAmount);
    const rebalanceFeeTxns = await this._getSwapFeeTxnsForZapIn(
      {
        account: owner,
        tokenInAddress: usdcAddressInThisChain,
      },
      transferAmount,
    );
    txns = txns.concat(approveTxn, ...rebalanceFeeTxns);
    for (const [key, protocolMetadata] of Object.entries(
      rebalancableUsdBalanceDict,
    )) {
      if (key === "pendingRewards") {
        continue;
      }
      if (protocolMetadata.weightDiff < 0) {
        const protocol = protocolMetadata.protocol;
        const percentageBN = ethers.BigNumber.from(
          Math.floor(
            (-protocolMetadata.weightDiff /
              protocolMetadata.negativeWeigtDiffSum) *
              10000,
          ),
        );
        // some protocol's zap-in has a minimum limit
        if (zapInAmountAfterFee.mul(percentageBN).div(10000) < 100000) continue;
        txns = txns.concat(
          await protocol.interface.zapIn(
            owner,
            zapInAmountAfterFee.mul(percentageBN).div(10000),
            usdcSymbol,
            usdcAddressInThisChain,
            slippage,
            tokenPricesMappingTable,
            updateProgress,
            this.existingInvestmentPositions["arbitrum"],
          ),
        );
      }
    }
    return txns;
  }

  async _getProtocolUsdBalanceDictionary(owner) {
    const protocolPromises = Object.values(this.strategy)
      .flatMap((category) => Object.entries(category))
      .flatMap(([chain, protocols]) =>
        protocols
          .filter((protocol) => protocol.weight !== 0)
          .map(async (protocol) => {
            const protocolUsdBalance =
              await protocol.interface.usdBalanceOf(owner);
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
  async calProtocolAssetDustInWalletDictionary(owner) {
    const protocolPromises = Object.values(this.strategy)
      .flatMap((category) => Object.entries(category))
      .flatMap(([chain, protocols]) =>
        protocols.map(async (protocol) => {
          const assetBalance = await protocol.interface.assetBalanceOf(owner);
          return {
            chain,
            address: protocol.interface.assetContract.address,
            assetBalance,
          };
        }),
      );

    const results = await Promise.all(protocolPromises);

    return results.reduce((acc, { chain, address, assetBalance }) => {
      if (!acc[chain]) acc[chain] = {};
      acc[chain][address] = assetBalance;
      return acc;
    }, {});
  }
  async _getExistingInvestmentPositionsByChain(address, updateProgress) {
    const chainPromises = Object.entries(this.assetAddressSetByChain).map(
      async ([chain, lpTokens]) => {
        updateProgress(`Fetching ${chain}'s investment positions: ${lpTokens}`);
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
      usde: 1,
      susd: 1,
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

  async _getSwapFeeTxnsForZapIn(actionParams, transferAmount) {
    const referrer = await this._getReferrer(actionParams.account);
    const contract = getContract({
      client: THIRDWEB_CLIENT,
      address: actionParams.tokenInAddress,
      chain: arbitrum,
      abi: ERC20_ABI,
    });

    let platformFee = transferAmount;
    let txns = [];

    if (referrer) {
      const referralFee = this._calculateReferralFee(transferAmount);
      platformFee = transferAmount.sub(referralFee);

      txns.push(this._prepareTransferTxn(contract, referrer, referralFee));
    }

    txns.push(
      this._prepareTransferTxn(
        contract,
        PROTOCOL_TREASURY_ADDRESS,
        platformFee,
      ),
    );

    return txns;
  }

  async _swapFeeTxnsForZapOut(
    owner,
    tokenOutAddress,
    tokenOutSymbol,
    tokenPricesMappingTable,
    zapOutPercentage,
    portfolioUsdBalance,
  ) {
    let txns = [];
    const referrer = await this._getReferrer(owner);
    const tokenOutUsdBalance = portfolioUsdBalance * zapOutPercentage;
    const swapFeeUsd = tokenOutUsdBalance * this.swapFeeRate();
    const tokenOutDecimals = await getTokenDecimal(tokenOutAddress);
    const contract = getContract({
      client: THIRDWEB_CLIENT,
      address: tokenOutAddress,
      chain: arbitrum,
      abi: ERC20_ABI,
    });
    let platformFee = ethers.utils.parseUnits(
      (swapFeeUsd / tokenPricesMappingTable[tokenOutSymbol]).toFixed(
        tokenOutDecimals,
      ),
      tokenOutDecimals,
    );
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
}
