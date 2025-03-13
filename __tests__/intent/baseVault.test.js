import { describe, it, expect, beforeEach } from "vitest";
import { BaseVault } from "../../classes/Vaults/BaseVault";

// Mock protocol interface class
class MockProtocol {
  uniqueId() {
    return this.id;
  }
  constructor(id) {
    this.id = id;
  }
  rewards() {
    return [];
  }
}

describe("BaseVault", () => {
  let mockStrategies;
  let weightMapping;

  beforeEach(() => {
    // Setup mock strategies for each test
    mockStrategies = {
      staking: {
        ethereum: [
          { interface: new MockProtocol("eth-staking-1"), weight: 0.6 },
          { interface: new MockProtocol("eth-staking-2"), weight: 0.4 },
        ],
        polygon: [
          { interface: new MockProtocol("poly-staking-1"), weight: 1.0 },
        ],
      },
      lending: {
        ethereum: [
          { interface: new MockProtocol("eth-lending-1"), weight: 1.0 },
        ],
      },
    };

    weightMapping = {
      staking: 0.7,
      lending: 0.3,
    };
  });

  it("should create a vault with valid weights", () => {
    const vault = new BaseVault(mockStrategies, weightMapping, "Test Vault");
    expect(vault.portfolioName).toBe("Test Vault");
    expect(vault.weightMapping).toEqual(weightMapping);
  });

  it("should throw error if weight mapping doesn't sum to 1", () => {
    const invalidWeightMapping = {
      staking: 0.7,
      lending: 0.4, // Total is 1.1
    };

    expect(() => {
      new BaseVault(mockStrategies, invalidWeightMapping, "Test Vault");
    }).toThrow("Weight mapping must sum to 1");
  });

  it("should throw error on duplicate protocols", () => {
    const duplicateStrategies = {
      staking: {
        ethereum: [
          { interface: new MockProtocol("eth-staking-1"), weight: 0.5 },
          { interface: new MockProtocol("eth-staking-1"), weight: 0.5 }, // Duplicate ID
        ],
      },
    };

    expect(() => {
      new BaseVault(duplicateStrategies, { staking: 1 }, "Test Vault");
    }).toThrow("Duplicate protocol found");
  });

  it("should correctly normalize and scale weights", () => {
    const vault = new BaseVault(mockStrategies, weightMapping, "Test Vault");

    // Check if staking protocols are properly scaled (0.7 total weight)
    const ethStakingProtocols = vault.strategy.staking.ethereum;
    expect(ethStakingProtocols[0].weight).toBeCloseTo(0.21, 5); // 0.6 * 0.35 = 0.21
    expect(ethStakingProtocols[1].weight).toBeCloseTo(0.14, 5); // 0.4 * 0.35 = 0.14

    // Check if lending protocols are properly scaled (0.3 total weight)
    const ethLendingProtocols = vault.strategy.lending.ethereum;
    expect(ethLendingProtocols[0].weight).toBeCloseTo(0.3, 5);
  });
});
