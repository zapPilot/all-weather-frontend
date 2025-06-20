import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FlowChartMixin } from "../../classes/mixins/FlowChartMixin.js";
import flowChartEventEmitter from "../../utils/FlowChartEventEmitter.js";

// Mock dependencies
vi.mock("../../utils/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../utils/FlowChartEventEmitter", () => ({
  default: {
    queueUpdate: vi.fn(),
    getNodeState: vi.fn(),
  },
}));

// Mock protocol class that uses FlowChartMixin
class MockProtocol {
  constructor(
    protocolName = "test",
    mode = "single",
    symbolList = ["TEST"],
    chain = "arbitrum",
  ) {
    this.protocolName = protocolName;
    this.mode = mode;
    this.symbolList = symbolList;
    this.chain = chain;
    this.protocolVersion = "0";

    // Mix in FlowChartMixin methods
    Object.assign(this, FlowChartMixin);
  }

  uniqueId() {
    return `${this.chain}/${this.protocolName}/${
      this.protocolVersion
    }/${this.symbolList.join("-")}`;
  }

  _getTheBestTokenAddressToZapIn(inputToken, tokenInAddress, decimals) {
    return ["USDC", "0xUSDCAddress", 6];
  }

  _getTheBestTokenAddressToZapOut() {
    return ["USDC", "0xUSDCAddress", 6];
  }

  _getLPTokenPairesToZapIn() {
    return {
      lpTokens: [
        ["TOKEN1", "0xToken1Address"],
        ["TOKEN2", "0xToken2Address"],
      ],
    };
  }

  _getLPTokenAddressesToZapOut() {
    return {
      lpTokens: [
        ["TOKEN1", "0xToken1Address"],
        ["TOKEN2", "0xToken2Address"],
      ],
    };
  }
}

describe("FlowChartMixin", () => {
  let mockProtocol;

  beforeEach(() => {
    mockProtocol = new MockProtocol();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getZapInFlowChartData", () => {
    describe("Single Mode", () => {
      beforeEach(() => {
        mockProtocol.mode = "single";
      });

      it("should generate flow chart data for single mode with token swap", () => {
        const result = mockProtocol.getZapInFlowChartData(
          "WETH",
          "0xWETHAddress",
          0.5,
        );

        expect(result).toHaveProperty("nodes");
        expect(result).toHaveProperty("edges");
        expect(result.nodes).toHaveLength(4); // swap + approve + deposit + stake
        expect(result.edges).toHaveLength(3); // n-1 edges

        // Check swap node
        expect(result.nodes[0]).toMatchObject({
          id: expect.stringContaining("WETH-USDC-swap"),
          name: "Swap WETH to USDC",
        });

        // Check common nodes
        expect(result.nodes[1].name).toBe("Approve");
        expect(result.nodes[2].name).toBe("Deposit TEST");
        expect(result.nodes[3].name).toBe("stake");
      });

      it("should generate flow chart data for single mode without token swap", () => {
        // Mock same token addresses to avoid swap
        mockProtocol._getTheBestTokenAddressToZapIn = () => [
          "WETH",
          "0xWETHAddress",
          18,
        ];

        const result = mockProtocol.getZapInFlowChartData(
          "WETH",
          "0xWETHAddress",
          0.5,
        );

        expect(result.nodes).toHaveLength(3); // approve + deposit + stake (no swap)
        expect(result.edges).toHaveLength(2);

        expect(result.nodes[0].name).toBe("Approve");
        expect(result.nodes[1].name).toBe("Deposit TEST");
        expect(result.nodes[2].name).toBe("stake");
      });

      it("should enrich nodes with metadata", () => {
        const result = mockProtocol.getZapInFlowChartData(
          "WETH",
          "0xWETHAddress",
          0.5,
        );

        result.nodes.forEach((node) => {
          expect(node).toHaveProperty("chain", "arbitrum");
          expect(node).toHaveProperty("symbolList", ["TEST"]);
          expect(node).toHaveProperty("imgSrc", "/projectPictures/test.webp");
        });
      });

      it("should handle symbol list with bridged tokens", () => {
        mockProtocol.symbolList = ["USDC(bridged)", "WETH"];
        const result = mockProtocol.getZapInFlowChartData(
          "WETH",
          "0xWETHAddress",
          0.5,
        );

        result.nodes.forEach((node) => {
          expect(node.symbolList).toEqual(["USDC", "WETH"]);
        });
      });
    });

    describe("LP Mode", () => {
      beforeEach(() => {
        mockProtocol.mode = "LP";
        mockProtocol.symbolList = ["TOKEN1", "TOKEN2"];
      });

      it("should generate flow chart data for LP mode with token swaps", () => {
        const result = mockProtocol.getZapInFlowChartData(
          "WETH",
          "0xWETHAddress",
          0.5,
        );

        expect(result.nodes).toHaveLength(5); // 2 swaps + approve + deposit + stake
        expect(result.edges).toHaveLength(4);

        // Check swap nodes
        expect(result.nodes[0]).toMatchObject({
          id: expect.stringContaining("WETH-TOKEN1-swap"),
          name: "Swap WETH to TOKEN1",
        });
        expect(result.nodes[1]).toMatchObject({
          id: expect.stringContaining("WETH-TOKEN2-swap"),
          name: "Swap WETH to TOKEN2",
        });
      });

      it("should generate flow chart data for LP mode without swaps when input token matches", () => {
        // Mock to avoid any swaps
        mockProtocol._getLPTokenPairesToZapIn = () => ({
          lpTokens: [
            ["WETH", "0xWETHAddress"],
            ["WETH", "0xWETHAddress"],
          ],
        });

        const result = mockProtocol.getZapInFlowChartData(
          "WETH",
          "0xWETHAddress",
          0.5,
        );

        expect(result.nodes).toHaveLength(3); // approve + deposit + stake (no swaps)
        expect(result.nodes[0].name).toBe("Approve");
      });
    });

    describe("Edge Generation", () => {
      it("should generate correct edges with weight data", () => {
        const weight = 0.75;
        const result = mockProtocol.getZapInFlowChartData(
          "WETH",
          "0xWETHAddress",
          weight,
        );

        result.edges.forEach((edge) => {
          expect(edge).toMatchObject({
            id: expect.stringContaining("edge-"),
            source: expect.any(String),
            target: expect.any(String),
            data: { ratio: weight },
          });
        });

        // Check edge connections
        for (let i = 0; i < result.edges.length; i++) {
          expect(result.edges[i].source).toBe(result.nodes[i].id);
          expect(result.edges[i].target).toBe(result.nodes[i + 1].id);
        }
      });
    });
  });

  describe("getClaimFlowChartData", () => {
    describe("Single Mode", () => {
      beforeEach(() => {
        mockProtocol.mode = "single";
      });

      it("should generate claim flow chart data with token swap", () => {
        const result = mockProtocol.getClaimFlowChartData(
          "WETH",
          "0xWETHAddress",
        );

        expect(result.nodes).toHaveLength(2); // claim + swap
        expect(result.edges).toHaveLength(1);

        expect(result.nodes[0]).toMatchObject({
          id: expect.stringContaining("claim"),
          name: "Claim Rewards",
        });
        expect(result.nodes[1]).toMatchObject({
          id: expect.stringContaining("USDC-WETH-swap"),
          name: "Swap USDC to WETH",
        });
      });

      it("should generate claim flow chart data without swap when tokens match", () => {
        // Mock same token to avoid swap
        mockProtocol._getTheBestTokenAddressToZapOut = () => [
          "WETH",
          "0xWETHAddress",
          18,
        ];

        const result = mockProtocol.getClaimFlowChartData(
          "WETH",
          "0xWETHAddress",
        );

        expect(result.nodes).toHaveLength(1); // claim only
        expect(result.nodes[0].name).toBe("Claim Rewards");
      });
    });

    describe("LP Mode", () => {
      beforeEach(() => {
        mockProtocol.mode = "LP";
      });

      it("should generate claim flow chart data for LP mode with swaps", () => {
        const result = mockProtocol.getClaimFlowChartData(
          "WETH",
          "0xWETHAddress",
        );

        expect(result.nodes).toHaveLength(3); // claim + 2 swaps
        expect(result.edges).toHaveLength(2);

        expect(result.nodes[0].name).toBe("Claim Rewards");
        expect(result.nodes[1]).toMatchObject({
          name: "Swap TOKEN1 to WETH",
        });
        expect(result.nodes[2]).toMatchObject({
          name: "Swap TOKEN2 to WETH",
        });
      });
    });
  });

  describe("getZapOutFlowChartData", () => {
    describe("Single Mode", () => {
      it("should generate zap out flow chart data", () => {
        mockProtocol.mode = "single";
        const result = mockProtocol.getZapOutFlowChartData(
          "WETH",
          "0xWETHAddress",
          0.5,
        );

        expect(result.nodes).toHaveLength(4); // unstake + claim + withdraw + swap
        expect(result.edges).toHaveLength(3);

        expect(result.nodes[0].name).toBe("Unstake");
        expect(result.nodes[1].name).toBe("Claim Rewards");
        expect(result.nodes[2].name).toBe("Withdraw TEST");
        expect(result.nodes[3]).toMatchObject({
          name: "Swap USDC to WETH",
        });
      });

      it("should generate zap out flow chart without swap when tokens match", () => {
        mockProtocol.mode = "single";
        mockProtocol._getTheBestTokenAddressToZapOut = () => [
          "WETH",
          "0xWETHAddress",
          18,
        ];

        const result = mockProtocol.getZapOutFlowChartData(
          "WETH",
          "0xWETHAddress",
          0.5,
        );

        expect(result.nodes).toHaveLength(3); // unstake + claim + withdraw (no swap)
      });
    });

    describe("LP Mode", () => {
      it("should generate zap out flow chart data for LP mode", () => {
        mockProtocol.mode = "LP";
        mockProtocol.symbolList = ["TOKEN1", "TOKEN2"];

        const result = mockProtocol.getZapOutFlowChartData(
          "WETH",
          "0xWETHAddress",
          0.5,
        );

        expect(result.nodes).toHaveLength(5); // unstake + claim + withdraw + 2 swaps
        expect(result.edges).toHaveLength(4);

        expect(result.nodes[0].name).toBe("Unstake");
        expect(result.nodes[1].name).toBe("Claim Rewards");
        expect(result.nodes[2].name).toBe("Withdraw TOKEN1-TOKEN2");
      });
    });
  });

  describe("getTransferFlowChartData", () => {
    it("should generate transfer flow chart data", () => {
      const weight = 0.3;
      const result = mockProtocol.getTransferFlowChartData(weight);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);

      expect(result.nodes[0]).toMatchObject({
        id: expect.stringContaining("unstake"),
        name: "Unstake",
      });
      expect(result.nodes[1]).toMatchObject({
        id: expect.stringContaining("transfer"),
        name: "Transfer",
      });

      expect(result.edges[0]).toMatchObject({
        data: { ratio: weight },
      });
    });

    it("should enrich transfer nodes with metadata", () => {
      const result = mockProtocol.getTransferFlowChartData(0.5);

      result.nodes.forEach((node) => {
        expect(node).toHaveProperty("chain", "arbitrum");
        expect(node).toHaveProperty("symbolList", ["TEST"]);
        expect(node).toHaveProperty("imgSrc", "/projectPictures/test.webp");
      });
    });
  });

  describe("getStakeFlowChartData", () => {
    it("should generate stake flow chart data", () => {
      const result = mockProtocol.getStakeFlowChartData();

      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);

      expect(result.nodes[0]).toMatchObject({
        id: expect.stringContaining("stake"),
        name: "stake",
      });
    });

    it("should enrich stake node with metadata", () => {
      const result = mockProtocol.getStakeFlowChartData();

      expect(result.nodes[0]).toHaveProperty("chain", "arbitrum");
      expect(result.nodes[0]).toHaveProperty("symbolList", ["TEST"]);
      expect(result.nodes[0]).toHaveProperty(
        "imgSrc",
        "/projectPictures/test.webp",
      );
    });
  });

  describe("_updateProgressAndWait", () => {
    it("should queue update and call updateProgress function", () => {
      const updateProgress = vi.fn();
      const nodeId = "test-node";
      const tradingLoss = 0.01;

      const result = mockProtocol._updateProgressAndWait(
        updateProgress,
        nodeId,
        tradingLoss,
      );

      expect(flowChartEventEmitter.queueUpdate).toHaveBeenCalledWith({
        type: "NODE_UPDATE",
        nodeId,
        status: "active",
        tradingLoss,
      });

      expect(updateProgress).toHaveBeenCalledWith(nodeId, tradingLoss);
      expect(result).toBe(true);
    });

    it("should handle errors gracefully", () => {
      const updateProgress = vi.fn();
      const nodeId = "test-node";
      const tradingLoss = 0.01;

      // Mock error in queueUpdate
      flowChartEventEmitter.queueUpdate.mockImplementation(() => {
        throw new Error("Test error");
      });

      const result = mockProtocol._updateProgressAndWait(
        updateProgress,
        nodeId,
        tradingLoss,
      );

      expect(updateProgress).toHaveBeenCalledWith(nodeId, tradingLoss);
      expect(result).toBe(false);
    });

    it("should work when updateProgress is not a function", () => {
      const result = mockProtocol._updateProgressAndWait(
        null,
        "test-node",
        0.01,
      );
      expect(result).toBe(true);
    });
  });

  describe("_verifyNodeActivation", () => {
    it("should return true when node is activated", async () => {
      flowChartEventEmitter.getNodeState.mockReturnValue({
        status: "active",
      });

      const result = await mockProtocol._verifyNodeActivation("test-node");
      expect(result).toBe(true);
      expect(flowChartEventEmitter.getNodeState).toHaveBeenCalledWith(
        "test-node",
      );
    });

    it("should return false when node is not activated after max attempts", async () => {
      flowChartEventEmitter.getNodeState.mockReturnValue({
        status: "inactive",
      });

      const result = await mockProtocol._verifyNodeActivation("test-node", 2);
      expect(result).toBe(false);
      expect(flowChartEventEmitter.getNodeState).toHaveBeenCalledTimes(2);
    });

    it("should return false when node state is null", async () => {
      flowChartEventEmitter.getNodeState.mockReturnValue(null);

      const result = await mockProtocol._verifyNodeActivation("test-node", 1);
      expect(result).toBe(false);
    });

    it("should retry multiple times before giving up", async () => {
      flowChartEventEmitter.getNodeState
        .mockReturnValueOnce({ status: "inactive" })
        .mockReturnValueOnce({ status: "inactive" })
        .mockReturnValueOnce({ status: "active" });

      const result = await mockProtocol._verifyNodeActivation("test-node", 3);
      expect(result).toBe(true);
      expect(flowChartEventEmitter.getNodeState).toHaveBeenCalledTimes(3);
    });
  });

  describe("_handleTransactionProgress", () => {
    beforeEach(() => {
      vi.spyOn(mockProtocol, "_updateProgressAndWait").mockReturnValue(true);
      vi.spyOn(mockProtocol, "_verifyNodeActivation").mockResolvedValue(true);
      vi.spyOn(global, "setTimeout").mockImplementation((fn) => fn());
    });

    it("should handle transaction progress successfully", async () => {
      const updateProgress = vi.fn();
      const nodeId = "test-node";
      const tradingLoss = 0.01;
      const operation = "approve";

      const result = await mockProtocol._handleTransactionProgress(
        updateProgress,
        nodeId,
        tradingLoss,
        operation,
      );

      expect(result).toBe(true);
      expect(mockProtocol._updateProgressAndWait).toHaveBeenCalledWith(
        updateProgress,
        nodeId,
        tradingLoss,
      );
      expect(mockProtocol._verifyNodeActivation).toHaveBeenCalledWith(nodeId);
    });

    it("should handle update progress failure", async () => {
      mockProtocol._updateProgressAndWait.mockReturnValue(false);

      const result = await mockProtocol._handleTransactionProgress(
        vi.fn(),
        "test-node",
        0.01,
        "approve",
      );

      expect(result).toBe(false);
      expect(mockProtocol._verifyNodeActivation).not.toHaveBeenCalled();
    });

    it("should warn when node activation fails", async () => {
      const logger = await import("../../utils/logger.js");
      mockProtocol._verifyNodeActivation.mockResolvedValue(false);

      await mockProtocol._handleTransactionProgress(
        vi.fn(),
        "test-node",
        0.01,
        "approve",
      );

      expect(logger.default.warn).toHaveBeenCalledWith(
        "Node test-node not activated after approve",
      );
    });

    it("should handle errors gracefully", async () => {
      const logger = await import("../../utils/logger.js");
      mockProtocol._updateProgressAndWait.mockImplementation(() => {
        throw new Error("Test error");
      });

      const result = await mockProtocol._handleTransactionProgress(
        vi.fn(),
        "test-node",
        0.01,
        "approve",
      );

      expect(result).toBe(false);
      expect(logger.default.error).toHaveBeenCalledWith(
        "Error in transaction progress for approve:",
        expect.any(Error),
      );
    });

    it("should add random sleep duration", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // Mock random to return 0.5

      await mockProtocol._handleTransactionProgress(
        vi.fn(),
        "test-node",
        0.01,
        "approve",
      );

      // Should call setTimeout with value between 0-2000ms
      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Number),
      );
    });
  });

  describe("Integration Tests", () => {
    it("should work with different protocol configurations", () => {
      const lpProtocol = new MockProtocol(
        "uniswap",
        "LP",
        ["TOKEN1", "TOKEN2"],
        "ethereum",
      );

      const result = lpProtocol.getZapInFlowChartData(
        "WETH",
        "0xWETHAddress",
        0.5,
      );

      expect(result.nodes.length).toBeGreaterThan(3);
      result.nodes.forEach((node) => {
        expect(node.chain).toBe("ethereum");
        expect(node.imgSrc).toBe("/projectPictures/uniswap.webp");
      });
    });

    it("should generate unique node IDs for different protocols", () => {
      const protocol1 = new MockProtocol("protocol1", "single", ["TOKEN1"]);
      const protocol2 = new MockProtocol("protocol2", "single", ["TOKEN2"]);

      const result1 = protocol1.getZapInFlowChartData(
        "WETH",
        "0xWETHAddress",
        0.5,
      );
      const result2 = protocol2.getZapInFlowChartData(
        "WETH",
        "0xWETHAddress",
        0.5,
      );

      expect(result1.nodes[0].id).not.toBe(result2.nodes[0].id);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty symbol list", () => {
      mockProtocol.symbolList = [];
      const result = mockProtocol.getZapInFlowChartData(
        "WETH",
        "0xWETHAddress",
        0.5,
      );

      // Should still generate nodes even with empty symbol list
      expect(result.nodes).toHaveLength(4); // swap + approve + deposit + stake
      expect(result.nodes[2].name).toBe("Deposit "); // deposit node with empty string
    });

    it("should handle zero weight", () => {
      const result = mockProtocol.getZapInFlowChartData(
        "WETH",
        "0xWETHAddress",
        0,
      );

      result.edges.forEach((edge) => {
        expect(edge.data.ratio).toBe(0);
      });
    });

    it("should handle undefined mode gracefully", () => {
      mockProtocol.mode = undefined;
      const result = mockProtocol.getZapInFlowChartData(
        "WETH",
        "0xWETHAddress",
        0.5,
      );

      // Should still return valid structure
      expect(result).toHaveProperty("nodes");
      expect(result).toHaveProperty("edges");
    });
  });
});
