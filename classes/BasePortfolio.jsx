import { tokensAndCoinmarketcapIdsFromDropdownOptions } from "../utils/contractInteractions";
import assert from "assert";
import { oneInchAddress } from "../utils/oneInch";
import axios from "axios";
import { getTokenDecimal, approve } from "../utils/general";
import { ethers } from "ethers";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../utils/thirdweb";
import ERC20_ABI from "../lib/contracts/ERC20.json" assert { type: "json" };
import WETH from "../lib/contracts/WETH.json" assert { type: "json" };
import ReactMarkdown from "react-markdown";
import getTheBestBridge from "./bridges/bridgeFactory";
import { CHAIN_TO_CHAIN_ID, TOKEN_ADDRESS_MAP } from "../utils/general";
import { toWei } from "thirdweb/utils";

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
        chain: protocol.interface.chain,
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
    let positiveWeigtDiffSum = 0;
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
        } else {
          positiveWeigtDiffSum += data.weightDiff;
        }
      }
    }
    for (const data of Object.values(usdBalanceDict)) {
      if (negativeWeigtDiffSum < 0) {
        data.negativeWeigtDiffSum = Math.abs(negativeWeigtDiffSum);
      }
      data.positiveWeigtDiffSum = positiveWeigtDiffSum;
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
      const platformFee = this.mulSwapFeeRate(actionParams.zapInAmount);
      const normalizedPlatformFeeUSD =
        ethers.utils.formatUnits(platformFee, actionParams.tokenDecimals) *
        actionParams.tokenPricesMappingTable[actionParams.tokenInSymbol];
      totalTxns.push(
        approve(
          actionParams.tokenInAddress,
          oneInchAddress,
          actionParams.zapInAmount,
          actionParams.updateProgress,
          actionParams.chainMetadata.id,
        ),
      );
      const referrer = await this._getReferrer(actionParams.account);
      const platformFeeTxns = await this._getPlatformFeeTxns(
        actionParams.tokenInAddress,
        actionParams.chainMetadata,
        platformFee,
        referrer,
      );
      actionParams.setPlatformFee(-normalizedPlatformFeeUSD);
      totalTxns = totalTxns.concat(platformFeeTxns);
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

  async _processProtocolActions(actionName, actionParams) {
    const currentChain = actionParams.chainMetadata.name
      .toLowerCase()
      .replace(" one", "");
    const actionHandlers = {
      zapIn: async (protocol, chain, derivative) => {
        // TODO(david): zap in's weight should take protocolUsdBalanceDictionary into account
        // protocolUsdBalanceDictionary = await this._getProtocolUsdBalanceDictionary(owner, actionParams.tokenPricesMappingTable)
        if (protocol.weight === 0) return null;
        const percentageBN = ethers.BigNumber.from(
          Math.floor(protocol.weight * derivative * 10000),
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
        if (protocolUsdBalance * actionParams.zapOutPercentage < 1) {
          // to avoid high slippage, we need to zap out at least 1 dollar
          normalizedZapOutPercentage = 1 / protocolUsdBalance;
        }
        return protocol.interface.zapOut(
          actionParams.account,
          normalizedZapOutPercentage,
          actionParams.tokenOutSymbol === "eth"
            ? TOKEN_ADDRESS_MAP.weth[
              chain
              ]
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
          actionParams.tokenOutAddress,
          actionParams.slippage,
          actionParams.tokenPricesMappingTable,
          actionParams.updateProgress,
          this.existingInvestmentPositions[chain],
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
        const percentageBN = ethers.BigNumber.from(
          Math.floor(totalWeight * 10000),
        );
        const bridge = await getTheBestBridge();
        const bridgeTxns = await bridge.getBridgeTxns(
          actionParams.account,
          actionParams.chainMetadata.id,
          CHAIN_TO_CHAIN_ID[chain],
          TOKEN_ADDRESS_MAP[actionParams.tokenInSymbol][currentChain],
          TOKEN_ADDRESS_MAP[actionParams.tokenInSymbol][chain],
          actionParams.zapInAmount.mul(percentageBN).div(10000),
          actionParams.updateProgress,
        );
        return bridgeTxns;
      },
    };
    // Separate function to process protocol transactions
    const processProtocolTxns = async (currentChain) => {
      const txns = [];
      for (const protocolsInThisCategory of Object.values(this.strategy)) {
        for (const [chain, protocols] of Object.entries(
          protocolsInThisCategory,
        )) {
          if (chain.toLowerCase() !== currentChain) continue;
          const totalWeight = protocols.reduce(
            (sum, protocol) => sum + (protocol.weight || 0),
            0,
          );
          let derivative = 1;
          if (actionParams.onlyThisChain === true) {
            derivative = 1 / totalWeight;
          }
          for (const protocol of protocols) {
            const txnsForThisProtocol = await actionHandlers[actionName](
              protocol,
              chain,
              derivative,
            );
            if (txnsForThisProtocol) {
              txns.push(...txnsForThisProtocol);
            }
          }
        }
      }
      return txns;
    };

    // Separate function to process bridge transactions
    const processBridgeTxns = async (currentChain) => {
      const txns = [];
      for (const protocolsInThisCategory of Object.values(this.strategy)) {
        const targetChains = Object.entries(protocolsInThisCategory)
          .filter(([chain, protocols]) => chain.toLowerCase() !== currentChain)
          .map(([chain, protocols]) => {
            const totalWeight = protocols.reduce(
              (sum, protocol) => sum + (protocol.weight || 0),
              0,
            );
            return { chain, totalWeight };
          });

        for (const { chain, totalWeight } of targetChains) {
          if (totalWeight === 0) continue;
          const bridgeTxns = await actionHandlers["bridge"](chain, totalWeight);
          txns.push(...bridgeTxns);
        }
      }
      return txns;
    };

    // Execute protocol transactions first
    const protocolTxns = await processProtocolTxns(currentChain);
    // Then execute bridge transactions if needed
    const bridgeTxns =
      actionParams.onlyThisChain === true
        ? []
        : await processBridgeTxns(currentChain);
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
    const txns = [];
    const currentChain = chainMetadata.name.toLowerCase().replace(" one", "");
    const middleTokenConfig = this._getRebalanceMiddleTokenConfig(currentChain);
    const bridge = await getTheBestBridge();
    // Filter protocols for the current chain
    const rebalancableUsdBalanceDictOnThisChain = this._filterProtocolsForChain(
      rebalancableUsdBalanceDict,
      currentChain,
    );
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
    txns.push(...zapOutTxns);

    if (zapOutUsdcBalance === 0) return txns;
    // Calculate zap in amount including pending rewards
    const zapInConfig = this._calculateZapInAmount(
      zapOutUsdcBalance,
      rebalancableUsdBalanceDictOnThisChain,
      slippage,
      middleTokenConfig.decimals,
    );
    // Generate approval and fee transactions
    const [approvalAndFeeTxns, zapInAmountAfterFee] =
      await this._generateApprovalAndFeeTxns(
        middleTokenConfig,
        zapInConfig.amount,
        chainMetadata,
        zapOutUsdcBalance,
        actionParams,
      );
    txns.push(...approvalAndFeeTxns);
    // Generate zap in transactions for protocols that need rebalancing
    const zapInTxns = await this._generateZapInTxns(
      owner,
      rebalancableUsdBalanceDictOnThisChain,
      zapInAmountAfterFee,
      middleTokenConfig,
      slippage,
      tokenPricesMappingTable,
      updateProgress,
    );
    txns.push(...zapInTxns);
    const rebalancableUsdBalanceDictOnOtherChains =
      this._filterProtocolsForOtherChains(
        rebalancableUsdBalanceDict,
        currentChain,
      );
    for (const [chain, metadata] of Object.entries(
      rebalancableUsdBalanceDictOnOtherChains,
    )) {
      const totalWeight = metadata.totalWeight;
      const bridgeToOtherChainTxns = await bridge.getBridgeTxns(
        owner,
        chainMetadata.id,
        CHAIN_TO_CHAIN_ID[chain],
        this._getRebalanceMiddleTokenConfig(currentChain).address,
        this._getRebalanceMiddleTokenConfig(chain).address,
        ethers.BigNumber.from(
          Math.floor(Number(zapInAmountAfterFee) * totalWeight),
        ),
        updateProgress,
      );
      this._updateProgressAndWait(actionParams.updateProgress, chain, 0);
      txns.push(...bridgeToOtherChainTxns);
    }
    // Combine all transactions

    return txns;
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

  _filterProtocolsForOtherChains(rebalancableUsdBalanceDict, currentChain) {
    const negativeWeigtDiffSum = Object.values(rebalancableUsdBalanceDict)[0]
      .negativeWeigtDiffSum;
    // First filter protocols from other chains
    const otherChainProtocols = Object.entries(
      rebalancableUsdBalanceDict,
    ).filter(
      ([key, metadata]) =>
        metadata.chain !== currentChain &&
        key !== "pendingRewards" &&
        metadata.weightDiff < 0,
    );
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

    for (const protocolsInThisCategory of Object.values(this.strategy)) {
      for (const [chain, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        if (onlyThisChain && chain !== currentChain) continue;

        for (const protocol of protocols) {
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

          txns = txns.concat(protocolTxns);
          zapOutUsdcBalance += protocolBalance;
        }
      }
    }

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

    const protocolClassName =
      protocol.interface.uniqueId() + protocol.interface.constructor.name;
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
    zapOutUsdcBalance,
    rebalancableDict,
    slippage,
    decimals,
  ) {
    const amount = ethers.utils.parseUnits(
      (
        (zapOutUsdcBalance * (100 - slippage)) / 100 +
        rebalancableDict.pendingRewards.usdBalance * REWARD_SLIPPAGE
      ).toFixed(decimals),
      decimals,
    );
    return { amount };
  }

  async _generateApprovalAndFeeTxns(
    usdcConfig,
    zapInAmount,
    chainMetadata,
    zapOutUsdcBalance,
    actionParams,
  ) {
    const approveTxn = approve(
      usdcConfig.address,
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
      zapOutUsdcBalance,
      usdcConfig,
    );

    return [[approveTxn, ...rebalanceFeeTxns], zapInAmountAfterFee];
  }

  async _generateZapInTxns(
    owner,
    rebalancableDict,
    zapInAmountAfterFee,
    usdcConfig,
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
        Math.floor(
          (-metadata.weightDiff / metadata.negativeWeigtDiffSum) * 10000,
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
        usdcConfig.symbol,
        usdcConfig.address,
        usdcConfig.decimals,
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
    for (const { protocol } of Object.values(protocolAssetDustInWallet)) {
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
    // [TODO](david): remove this table and use update to date data
    let tokenPricesMappingTable = {
      usdc: 1,
      usdt: 1,
      dai: 1,
      frax: 0.997,
      usde: 1,
      susd: 0.9952,
      msusd: 0.9972,
      zunusd: 0.9953,
      eusd: 0.9999,
      gusdc: 1.13,
      dusdc: 1,
    };
    let tokenPriceCache = {};
    for (const [token, coinMarketCapId] of Object.entries(
      this.uniqueTokenIdsForCurrentPrice,
    )) {
      if (Object.keys(tokenPricesMappingTable).includes(token)) continue;
      if (tokenPriceCache[coinMarketCapId]) {
        tokenPricesMappingTable[token] = tokenPriceCache[coinMarketCapId];
        continue;
      }
      axios
        .get(
          `${process.env.NEXT_PUBLIC_API_URL}/token/${coinMarketCapId}/price`,
        )
        .then((result) => {
          tokenPricesMappingTable[token] = result.data.price;
          tokenPriceCache[coinMarketCapId] = result.data.price;
        });
    }
    return tokenPricesMappingTable;
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
      for (const [key, protocolObj] of Object.entries(
        actionParams.rebalancableUsdBalanceDict,
      )) {
        if (key === "pendingRewards") continue;
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
          }
          const rebalanceRatio =
            protocolObj.weightDiff / protocolObj.positiveWeigtDiffSum;
          const stepsData =
            protocolObj.protocol.interface.getZapOutFlowChartData(
              actionParams.outputToken,
              actionParams.outputTokenAddress,
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
        if (key === "pendingRewards") continue;
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

  async _getSwapFeeTxnsForZapIn(actionParams, platformFee, usdcConfig) {
    const normalizedPlatformFeeUsd =
      ethers.utils.formatUnits(platformFee, usdcConfig.decimals) *
      usdcConfig.price;
    actionParams.setPlatformFee(-normalizedPlatformFeeUsd);
    const referrer = await this._getReferrer(actionParams.account);
    return this._getPlatformFeeTxns(
      actionParams.tokenInAddress,
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
      wrappedTokenAddress = TOKEN_ADDRESS_MAP.weth[
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
          : { params: [amount] }
      ),
      }),
      wrappedTokenAddress,
      wrappedTokenSymbol,
    ];
  }
}
