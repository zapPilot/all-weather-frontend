import { normalizeChainName } from "../utils/chainHelper";
export class PortfolioFlowChartBuilder {
  constructor(portfolio) {
    this.portfolio = portfolio;
  }

  _isRebalanceAction(actionName) {
    return ["rebalance", "crossChainRebalance", "localRebalance"].includes(
      actionName,
    );
  }

  _calculateChainWeights() {
    const chainWeights = new Map();
    for (const protocolsInThisCategory of Object.values(
      this.portfolio.strategy,
    )) {
      for (const [chain, protocolsOnThisChain] of Object.entries(
        protocolsInThisCategory,
      )) {
        const chainWeight = protocolsOnThisChain.reduce(
          (sum, protocol) => sum + protocol.weight,
          0,
        );
        const currentWeight = chainWeights.get(chain) || 0;
        chainWeights.set(chain, currentWeight + chainWeight);
      }
    }
    return chainWeights;
  }

  _getProtocolObjByUniqueId(uniqueId) {
    for (const protocolsInThisCategory of Object.values(
      this.portfolio.strategy,
    )) {
      for (const protocolsOnThisChain of Object.values(
        protocolsInThisCategory,
      )) {
        for (const protocol of protocolsOnThisChain) {
          if (protocol.interface.uniqueId() === uniqueId) return protocol;
        }
      }
    }
  }

  _formatChainNodeAmount(
    actionName,
    actionParams,
    chainWeight,
    tokenPricesMappingTable,
    chain,
  ) {
    if (actionName === "zapIn") {
      let ratio;
      if (actionParams.onlyThisChain === true) {
        ratio =
          normalizeChainName(actionParams.chainMetadata?.name) === chain
            ? 1
            : 0;
      } else {
        ratio = chainWeight;
      }
      return (
        (
          actionParams.investmentAmount *
          tokenPricesMappingTable[actionParams.tokenInSymbol] *
          ratio
        ).toFixed(2) || 0
      );
    }
    if (actionName === "zapOut") {
      return (actionParams.zapOutAmount * chainWeight).toFixed(2) || 0;
    }
    return 0;
  }

  _buildStandardFlowChart(
    actionName,
    actionParams,
    flowChartData,
    chainNodes,
    tokenPricesMappingTable,
  ) {
    const chainSet = new Set();
    const chainWeights = this._calculateChainWeights();
    for (const [category, protocolsInThisCategory] of Object.entries(
      this.portfolio.strategy,
    )) {
      for (const [chain, protocolsOnThisChain] of Object.entries(
        protocolsInThisCategory,
      )) {
        let chainNode;
        if (!chainSet.has(chain)) {
          chainSet.add(chain);
          chainNode = {
            id: chain,
            name: `${actionName} $${this._formatChainNodeAmount(
              actionName,
              actionParams,
              chainWeights.get(chain),
              tokenPricesMappingTable,
              chain,
            )}`,
            chain: chain,
            category: category,
            imgSrc: `/chainPicturesWebp/${chain}.webp`,
          };
          chainNodes.push(chainNode);
        } else {
          chainNode = chainNodes.find((node) => node.id === chain);
        }

        for (const protocol of protocolsOnThisChain) {
          let stepsData = [];
          if (
            (actionName === "zapIn" && protocol.weight === 0) ||
            (actionName !== "zapIn" &&
              actionParams.usdBalanceDict?.[protocol.interface.uniqueId()]
                ?.usdBalance === 0)
          )
            continue;

          stepsData = this._getStepsData(
            actionName,
            protocol,
            actionParams,
            protocol.weight,
          );

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

  _getStepsData(actionName, protocol, actionParams, weight) {
    switch (actionName) {
      case "zapIn":
        return protocol.interface.getZapInFlowChartData(
          actionParams.tokenInSymbol,
          actionParams.tokenInAddress,
          weight,
        );
      case "stake":
        return protocol.interface.getStakeFlowChartData();
      case "transfer":
        return protocol.interface.getTransferFlowChartData(weight);
      case "zapOut":
        return protocol.interface.getZapOutFlowChartData(
          actionParams.outputToken,
          actionParams.outputTokenAddress,
          weight,
        );
      case "claimAndSwap":
        return protocol.interface.getClaimFlowChartData(
          actionParams.outputToken,
          actionParams.outputTokenAddress,
        );
      default:
        throw new Error(`Invalid action name ${actionName}`);
    }
  }

  buildFlowChart(actionName, actionParams, tokenPricesMappingTable) {
    let flowChartData = {
      nodes: [],
      edges: [],
    };
    const chainNodes = [];
    if (this._isRebalanceAction(actionName)) {
      const chainSet = new Set();
      let chainNode;
      let endOfZapOutNodeOnThisChain;
      let middleTokenConfig;
      const zapOutChains =
        actionParams.rebalancableUsdBalanceDict.metadata.rebalanceActionsByChain
          .filter((action) => this._isRebalanceAction(action.actionName))
          .map((action) => action.chain);
      for (const [key, protocolObj] of Object.entries(
        actionParams.rebalancableUsdBalanceDict,
      )) {
        const protocolObjInterface = this._getProtocolObjByUniqueId(key);
        if (
          key === "pendingRewards" ||
          key === "metadata" ||
          !zapOutChains.includes(protocolObj.chain)
        )
          continue;
        if (protocolObj.weightDiff > this.portfolio.rebalanceThreshold()) {
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
            middleTokenConfig = this.portfolio._getRebalanceMiddleTokenConfig(
              protocolObj.chain,
            );
          }
          const rebalanceRatio =
            protocolObj.weightDiff / protocolObj.positiveWeigtDiffSum;
          const stepsData =
            protocolObjInterface.interface.getZapOutFlowChartData(
              middleTokenConfig.symbol,
              middleTokenConfig.address,
              rebalanceRatio,
            );
          const currentChainToProtocolNodeEdge = {
            id: `edge-${
              chainNode.id
            }-${protocolObjInterface.interface.uniqueId()}`,
            source: chainNode.id,
            target: stepsData.nodes[0].id,
            data: {
              ratio: rebalanceRatio,
              usdAmount: actionParams.rebalanceAmount,
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
        const protocolObjInterface = this._getProtocolObjByUniqueId(key);
        if (key === "pendingRewards" || key === "metadata") continue;
        if (protocolObj.weightDiff < 0) {
          const zapInRatio =
            -protocolObj.weightDiff / protocolObj.negativeWeigtDiffSum;
          const stepsData =
            protocolObjInterface.interface.getZapInFlowChartData(
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
            }-${protocolObjInterface.interface.uniqueId()}`,
            source:
              actionParams.chainMetadata.name
                .toLowerCase()
                .replace(" one", "")
                .replace(" mainnet", "") === protocolObj.chain
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
      this._buildStandardFlowChart(
        actionName,
        actionParams,
        flowChartData,
        chainNodes,
        tokenPricesMappingTable,
      );
    }
    return {
      nodes: chainNodes.concat(flowChartData.nodes),
      edges: flowChartData.edges,
    };
  }
}
