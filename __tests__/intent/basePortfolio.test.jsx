import { BasePortfolio } from "../../classes/BasePortfolio";
import { ethers } from "ethers";
import { describe, it, expect, beforeEach } from "vitest";
const mockProtocolInterface = {
  uniqueId: () => "mock-protocol-1",
  getZapInFlowChartData: (tokenSymbol, tokenAddress, weight) => ({
    nodes: [{ id: "mock-zap-in-node", name: "Zap In" }],
    edges: [
      {
        id: "mock-zap-in-edge",
        source: "mock-zap-in-node",
        target: "target",
      },
    ],
  }),
  getZapOutFlowChartData: (tokenSymbol, tokenAddress, weight) => ({
    nodes: [{ id: "mock-zap-out-node", name: "Zap Out" }],
    edges: [
      {
        id: "mock-zap-out-edge",
        source: "mock-zap-out-node",
        target: "target",
      },
    ],
  }),
  getStakeFlowChartData: () => ({
    nodes: [{ id: "mock-stake-node", name: "Stake" }],
    edges: [
      {
        id: "mock-stake-edge",
        source: "mock-stake-node",
        target: "target",
      },
    ],
  }),
  getTransferFlowChartData: (weight) => ({
    nodes: [{ id: "mock-transfer-node", name: "Transfer" }],
    edges: [
      {
        id: "mock-transfer-edge",
        source: "mock-transfer-node",
        target: "target",
      },
    ],
  }),
  rewards: () => [],
};
describe("SwapFee rates", () => {
  it("mulSwapFeeRate and swapFeeRate should be equivalent", () => {
    const testInstance = new BasePortfolio(
      {
        long_term_bond: {
          arbitrum: [
            {
              interface: mockProtocolInterface,
              weight: 1,
            },
          ],
        },
      },
      {
        long_term_bond: 1,
      },
    ); // Replace with your actual class name
    const testValue = ethers.utils.parseUnits("1", 18); // 1 unit with 18 decimals

    const bigNumberResult = testInstance.mulSwapFeeRate(testValue);
    const regularResult = testInstance.swapFeeRate();

    // Convert BigNumber result to a comparable number
    const bigNumberAsFloat = parseFloat(
      ethers.utils.formatUnits(bigNumberResult, 18),
    );

    // Use a small epsilon for floating-point comparison
    const epsilon = 1e-15;

    expect(Math.abs(bigNumberAsFloat - regularResult)).to.be.lessThan(epsilon);
  });
  it("mulReferralFeeRate and referralFeeRate should be equivalent", () => {
    const testInstance = new BasePortfolio(
      {
        long_term_bond: {
          arbitrum: [
            {
              interface: mockProtocolInterface,
              weight: 1,
            },
          ],
        },
      },
      {
        long_term_bond: 1,
      },
    ); // Replace with your actual class name
    const testValue = ethers.utils.parseUnits("1", 18); // 1 unit with 18 decimals

    const bigNumberResult = testInstance.mulReferralFeeRate(testValue);
    const regularResult = testInstance.referralFeeRate();

    // Convert BigNumber result to a comparable number
    const bigNumberAsFloat = parseFloat(
      ethers.utils.formatUnits(bigNumberResult, 18),
    );

    // Use a small epsilon for floating-point comparison
    const epsilon = 1e-15;

    expect(Math.abs(bigNumberAsFloat - regularResult)).to.be.lessThan(epsilon);
  });
});

describe("BasePortfolio - getFlowChartData", () => {
  let basePortfolio;
  let mockStrategy;

  beforeEach(() => {
    // Setup mock protocol interface

    // Setup mock strategy
    mockStrategy = {
      category1: {
        arbitrum: [
          {
            weight: 0.5,
            interface: mockProtocolInterface,
          },
        ],
        optimism: [
          {
            weight: 0.5,
            interface: mockProtocolInterface,
          },
        ],
      },
    };

    basePortfolio = new BasePortfolio(mockStrategy, {});
  });

  it("should generate flow chart data for zapIn action", () => {
    const actionParams = {
      tokenInSymbol: "USDC",
      tokenInAddress: "0x123",
      chainMetadata: { name: "arbitrum" },
    };

    const result = basePortfolio.getFlowChartData("zapIn", actionParams);

    expect(result).toHaveProperty("nodes");
    expect(result).toHaveProperty("edges");
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);

    // Verify chain nodes are created
    expect(result.nodes.some((node) => node.id === "arbitrum")).toBe(true);
    expect(result.nodes.some((node) => node.id === "optimism")).toBe(true);
  });

  it("should generate flow chart data for rebalance action", () => {
    const actionParams = {
      chainMetadata: { name: "arbitrum" },
      rebalancableUsdBalanceDict: {
        metadata: {
          rebalanceActionsByChain: [
            { chain: "arbitrum", actionName: "rebalance" },
          ],
        },
        "mock-protocol-1": {
          chain: "arbitrum",
          weightDiff: 0.1,
          positiveWeigtDiffSum: 0.1,
          protocol: { interface: mockProtocolInterface },
        },
      },
    };

    const result = basePortfolio.getFlowChartData("rebalance", actionParams);

    expect(result).toHaveProperty("nodes");
    expect(result).toHaveProperty("edges");
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it("should handle empty strategy", () => {
    expect(() => {
      basePortfolio = new BasePortfolio({}, {});
    }).toThrow("Total weight across all strategies should be 1, but is 0");
  });

  it("should throw error for invalid action name", () => {
    const actionParams = {
      tokenInSymbol: "USDC",
      tokenInAddress: "0x123",
      chainMetadata: { name: "arbitrum" },
    };

    expect(() => {
      basePortfolio.getFlowChartData("invalidAction", actionParams);
    }).toThrow("Invalid action name invalidAction");
  });

  it("should skip protocols with zero weight", () => {
    mockStrategy.category1.arbitrum[0].weight = 0;
    expect(() => {
      basePortfolio = new BasePortfolio(mockStrategy, {});
    }).toThrow("Total weight across all strategies should be 1, but is 0");

    const actionParams = {
      tokenInSymbol: "USDC",
      tokenInAddress: "0x123",
      chainMetadata: { name: "arbitrum" },
    };

    const result = basePortfolio.getFlowChartData("zapIn", actionParams);

    // Should only have chain nodes, no protocol nodes
    expect(
      result.nodes.every((node) => !node.id.includes("mock-protocol")),
    ).toBe(true);
  });

  it("should generate correct edge ratios", () => {
    const actionParams = {
      tokenInSymbol: "USDC",
      tokenInAddress: "0x123",
      chainMetadata: { name: "arbitrum" },
    };

    const result = basePortfolio.getFlowChartData("zapIn", actionParams);

    // Check that edge ratios match protocol weights
    const protocolEdges = result.edges.filter((edge) => edge.data?.ratio);
    protocolEdges.forEach((edge) => {
      expect(edge.data.ratio).toBe(0.5);
    });
  });
});
