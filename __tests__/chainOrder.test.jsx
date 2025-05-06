import { sortChains, getNextChain } from "../utils/chainOrder";
import { expect, describe, it } from "vitest";

describe("chainOrder utilities", () => {
  const mockChains = ["ethereum", "arbitrum", "optimism", "polygon"];
  const mockChainStatus = {
    ethereum: true,
    arbitrum: false,
    optimism: false,
    polygon: false,
  };

  describe("sortChains", () => {
    it("should return empty array for null input", () => {
      expect(sortChains(null, {}, "")).toEqual([]);
    });

    it("should sort chains by completion status first", () => {
      const result = sortChains(mockChains, mockChainStatus, "arbitrum");
      expect(result[0]).toBe("ethereum"); // Finished chain should be first
    });

    it("should prioritize current chain second", () => {
      const result = sortChains(mockChains, mockChainStatus, "arbitrum");
      const unfinishedChains = result.filter(
        (chain) => !mockChainStatus[chain],
      );
      expect(unfinishedChains[0]).toBe("arbitrum"); // Current chain should be first among unfinished
    });

    it("should sort by name length third", () => {
      const chains = ["ethereum", "arb", "optimism", "polygon"];
      const result = sortChains(chains, mockChainStatus, "ethereum");
      const unfinishedChains = result.filter(
        (chain) => !mockChainStatus[chain],
      );
      expect(unfinishedChains[0]).toBe("arb"); // Shortest name should be first
    });

    it("should sort alphabetically as last priority", () => {
      const chains = ["ethereum", "arbitrum", "optimism", "polygon"];
      const result = sortChains(chains, mockChainStatus, "ethereum");
      const unfinishedChains = result.filter(
        (chain) => !mockChainStatus[chain],
      );
      expect(unfinishedChains).toEqual(["polygon", "arbitrum", "optimism"]); // Alphabetical order
    });
  });

  describe("getNextChain", () => {
    it("should return null when all chains are complete", () => {
      const allCompleteStatus = {
        ethereum: true,
        arbitrum: true,
        optimism: true,
        polygon: true,
      };
      expect(
        getNextChain(mockChains, allCompleteStatus, "ethereum"),
      ).toBeNull();
    });

    it("should return the first unfinished chain", () => {
      const result = getNextChain(mockChains, mockChainStatus, "ethereum");
      expect(result).toBe("polygon"); // First unfinished chain
    });

    it("should prioritize current chain if unfinished", () => {
      const status = {
        ethereum: true,
        arbitrum: false,
        optimism: false,
        polygon: false,
      };
      const result = getNextChain(mockChains, status, "arbitrum");
      expect(result).toBe("arbitrum"); // Current chain should be prioritized
    });
  });
});
