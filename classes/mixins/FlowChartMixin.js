import flowChartEventEmitter from "../../utils/FlowChartEventEmitter";
import { ASSET_CONFIG } from "../../config/assetConfig";

export const FlowChartMixin = {
  getZapInFlowChartData(inputToken, tokenInAddress, weight) {
    const nodes = this._generateZapInNodes(inputToken, tokenInAddress);
    const edges = this._generateEdges(nodes, weight);
    this._enrichNodesWithMetadata(nodes);
    return { nodes, edges };
  },

  _generateZapInNodes(inputToken, tokenInAddress) {
    const nodes = [];
    if (this.mode === "single") {
      this._addSingleModeNodes(nodes, inputToken, tokenInAddress);
    } else if (this.mode === "LP") {
      this._addLPModeNodes(nodes, inputToken, tokenInAddress);
    }
    return nodes;
  },

  _addSingleModeNodes(nodes, inputToken, tokenInAddress) {
    const [bestTokenSymbol, bestTokenAddressToZapIn, decimals] =
      this._getTheBestTokenAddressToZapIn(
        inputToken,
        tokenInAddress,
        18, // inputTokenDecimalsPlaceholder
      );
    if (
      bestTokenAddressToZapIn.toLowerCase() !== tokenInAddress.toLowerCase()
    ) {
      nodes.push({
        id: `${this.uniqueId()}-${inputToken}-${bestTokenSymbol}-swap`,
        name: `Swap ${inputToken} to ${bestTokenSymbol}`,
      });
    }
    this._addCommonNodes(nodes);
  },

  _addLPModeNodes(nodes, inputToken, tokenInAddress) {
    const { lpTokens: tokenMetadatas } = this._getLPTokenPairesToZapIn();
    for (const [bestTokenSymbol, bestTokenAddressToZapIn] of tokenMetadatas) {
      if (
        bestTokenAddressToZapIn.toLowerCase() !== tokenInAddress.toLowerCase()
      ) {
        nodes.push({
          id: `${this.uniqueId()}-${inputToken}-${bestTokenSymbol}-swap`,
          name: `Swap ${inputToken} to ${bestTokenSymbol}`,
        });
      }
    }
    this._addCommonNodes(nodes);
  },

  _addCommonNodes(nodes) {
    const commonNodes = [
      {
        id: `${this.uniqueId()}-approve`,
        name: "Approve",
      },
      {
        id: `${this.uniqueId()}-deposit`,
        name: `Deposit ${this.symbolList.join("-")}`,
      },
      {
        id: `${this.uniqueId()}-stake`,
        name: "stake",
      },
    ];
    nodes.push(...commonNodes);
  },

  _generateEdges(nodes, weight) {
    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${this.uniqueId()}-${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        data: { ratio: weight },
      });
    }
    return edges;
  },

  _enrichNodesWithMetadata(nodes) {
    for (const node of nodes) {
      node.chain = this.chain;
      node.symbolList = this.symbolList.map((symbol) =>
        symbol.replace("(bridged)", ""),
      );
      node.imgSrc = ASSET_CONFIG.getAssetPath(
        `/projectPictures/${this.protocolName}.webp`,
      );
    }
  },

  getClaimFlowChartData(outputToken, outputTokenAddress) {
    const nodes = [];
    if (this.mode === "single") {
      nodes.push({
        id: `${this.uniqueId()}-claim`,
        name: "Claim Rewards",
      });
      const [bestTokenSymbol, bestTokenAddressToZapIn, _] =
        this._getTheBestTokenAddressToZapOut();
      if (
        outputTokenAddress.toLowerCase() !==
        bestTokenAddressToZapIn.toLowerCase()
      ) {
        nodes.push({
          id: `${this.uniqueId()}-${bestTokenSymbol}-${outputToken}-swap`,
          name: `Swap ${bestTokenSymbol} to ${outputToken}`,
        });
      }
    } else if (this.mode === "LP") {
      nodes.push({
        id: `${this.uniqueId()}-claim`,
        name: "Claim Rewards",
      });
      const { lpTokens: tokenMetadatas } = this._getLPTokenAddressesToZapOut();
      for (const [
        bestTokenSymbol,
        bestTokenAddressToZapOut,
      ] of tokenMetadatas) {
        if (
          bestTokenAddressToZapOut.toLowerCase() !==
          outputTokenAddress.toLowerCase()
        ) {
          nodes.push({
            id: `${this.uniqueId()}-${bestTokenSymbol}-${outputToken}-swap`,
            name: `Swap ${bestTokenSymbol} to ${outputToken}`,
          });
        }
      }
    }
    const edges = this._generateEdges(nodes, 1);
    this._enrichNodesWithMetadata(nodes);
    return { nodes, edges };
  },

  getZapOutFlowChartData(outputToken, outputTokenAddress, weight) {
    const nodes = [];
    if (this.mode === "single") {
      nodes.push(
        {
          id: `${this.uniqueId()}-unstake`,
          name: "Unstake",
        },
        {
          id: `${this.uniqueId()}-claim`,
          name: "Claim Rewards",
        },
        {
          id: `${this.uniqueId()}-withdraw`,
          name: `Withdraw ${this.symbolList.join("-")}`,
        },
      );
      const [bestTokenSymbol, bestTokenAddressToZapIn, _] =
        this._getTheBestTokenAddressToZapOut();
      if (
        outputTokenAddress.toLowerCase() !==
        bestTokenAddressToZapIn.toLowerCase()
      ) {
        nodes.push({
          id: `${this.uniqueId()}-${bestTokenSymbol}-${outputToken}-swap`,
          name: `Swap ${bestTokenSymbol} to ${outputToken}`,
        });
      }
    } else if (this.mode === "LP") {
      nodes.push(
        {
          id: `${this.uniqueId()}-unstake`,
          name: "Unstake",
        },
        {
          id: `${this.uniqueId()}-claim`,
          name: "Claim Rewards",
        },
        {
          id: `${this.uniqueId()}-withdraw`,
          name: `Withdraw ${this.symbolList.join("-")}`,
        },
      );
      const { lpTokens: tokenMetadatas } = this._getLPTokenAddressesToZapOut();
      for (const [
        bestTokenSymbol,
        bestTokenAddressToZapOut,
      ] of tokenMetadatas) {
        if (
          bestTokenAddressToZapOut.toLowerCase() !==
          outputTokenAddress.toLowerCase()
        ) {
          nodes.push({
            id: `${this.uniqueId()}-${bestTokenSymbol}-${outputToken}-swap`,
            name: `Swap ${bestTokenSymbol} to ${outputToken}`,
          });
        }
      }
    }
    const edges = this._generateEdges(nodes, weight);
    this._enrichNodesWithMetadata(nodes);
    return { nodes, edges };
  },

  getTransferFlowChartData(weight) {
    const nodes = [
      {
        id: `${this.uniqueId()}-unstake`,
        name: "Unstake",
      },
      {
        id: `${this.uniqueId()}-transfer`,
        name: "Transfer",
      },
    ];
    this._enrichNodesWithMetadata(nodes);
    return {
      nodes,
      edges: [
        {
          id: `edge-${this.uniqueId()}-0`,
          source: `${this.uniqueId()}-unstake`,
          target: `${this.uniqueId()}-transfer`,
          data: {
            ratio: weight,
          },
        },
      ],
    };
  },

  getStakeFlowChartData() {
    const nodes = [
      {
        id: `${this.uniqueId()}-stake`,
        name: "stake",
      },
    ];
    this._enrichNodesWithMetadata(nodes);
    return {
      nodes,
      edges: [],
    };
  },

  _updateProgressAndWait(updateProgress, nodeId, tradingLoss) {
    try {
      flowChartEventEmitter.queueUpdate({
        type: "NODE_UPDATE",
        nodeId,
        status: "active",
        tradingLoss,
      });

      if (typeof updateProgress === "function") {
        updateProgress(nodeId, tradingLoss);
      }

      return true;
    } catch (error) {
      console.error("Error updating progress:", error);
      if (typeof updateProgress === "function") {
        updateProgress(nodeId, tradingLoss);
      }
      return false;
    }
  },

  async _verifyNodeActivation(nodeId, maxAttempts = 3) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const state = flowChartEventEmitter.getNodeState(nodeId);
      if (state && state.status === "active") {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
  },

  async _handleTransactionProgress(
    updateProgress,
    nodeId,
    tradingLoss,
    operation,
  ) {
    try {
      // Add random sleep to prevent concurrent RPC rate limiting
      const sleepDuration = Math.floor(Math.random() * 2000); // Random duration between 0-2000ms
      await new Promise((resolve) => setTimeout(resolve, sleepDuration));

      const updateSuccess = this._updateProgressAndWait(
        updateProgress,
        nodeId,
        tradingLoss,
      );

      if (updateSuccess) {
        const isActivated = await this._verifyNodeActivation(nodeId);
        if (!isActivated) {
          console.warn(`Node ${nodeId} not activated after ${operation}`);
        }
      }

      return updateSuccess;
    } catch (error) {
      console.error(`Error in transaction progress for ${operation}:`, error);
      return false;
    }
  },
};
