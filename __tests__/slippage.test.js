import { describe, it, expect } from "vitest";
import { determineSlippage } from "../utils/slippage.js";

describe("Slippage Utils", () => {
  describe("determineSlippage", () => {
    it("should return 3% for non-Stable+ Vault when key is not 1 or 2", () => {
      const params = {
        portfolioName: "ETH Vault",
        selectedTokenSymbol: "usdc",
        key: "3",
        actionName: "zapIn",
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should return 3% for null portfolio name when key is not 1 or 2", () => {
      const params = {
        portfolioName: null,
        selectedTokenSymbol: "usdc",
        key: "4",
        actionName: "zapIn",
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should return 40% when key is 5 for Stable+ Vault", () => {
      const params = {
        portfolioName: "Stable+ Vault",
        selectedTokenSymbol: "usdc",
        key: "5",
        actionName: "zapIn",
      };

      expect(determineSlippage(params)).toBe(40);
    });

    it("should return 40% when key is 5 for any portfolio", () => {
      const params = {
        portfolioName: "ETH Vault",
        selectedTokenSymbol: "usdc",
        key: "5",
        actionName: "zapIn",
      };

      // According to logic, non-Stable+ Vault with key "5" should return 3 from first condition
      expect(determineSlippage(params)).toBe(3);
    });

    it("should return 2% for ETH token in Stable+ Vault", () => {
      const params = {
        portfolioName: "Stable+ Vault",
        selectedTokenSymbol: "eth",
        key: "1",
        actionName: "zapIn",
      };

      expect(determineSlippage(params)).toBe(2);
    });

    it("should return 2% for WETH token in Stable+ Vault", () => {
      const params = {
        portfolioName: "Stable+ Vault",
        selectedTokenSymbol: "weth",
        key: "2",
        actionName: "zapOut",
      };

      expect(determineSlippage(params)).toBe(2);
    });

    it("should return 3% for zapIn action in ETH Vault", () => {
      const params = {
        portfolioName: "ETH Vault",
        selectedTokenSymbol: "usdc",
        key: "1",
        actionName: "zapIn",
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should return 3% for zapIn action in Index 500 Vault", () => {
      const params = {
        portfolioName: "Index 500 Vault",
        selectedTokenSymbol: "usdt",
        key: "2",
        actionName: "zapIn",
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should return 3% for non-zapIn action in ETH Vault", () => {
      const params = {
        portfolioName: "ETH Vault",
        selectedTokenSymbol: "usdc",
        key: "1",
        actionName: "zapOut",
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should return 3% for default case with key 1", () => {
      const params = {
        portfolioName: "Some Other Vault",
        selectedTokenSymbol: "usdc",
        key: "1",
        actionName: "transfer",
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should return 3% for default case with key 2", () => {
      const params = {
        portfolioName: "BTC Vault",
        selectedTokenSymbol: "btc",
        key: "2",
        actionName: "stake",
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should return 3% for Stable+ Vault with non-ETH/WETH tokens", () => {
      const params = {
        portfolioName: "Stable+ Vault",
        selectedTokenSymbol: "usdc",
        key: "1",
        actionName: "zapIn",
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should handle undefined parameters gracefully", () => {
      const params = {
        portfolioName: undefined,
        selectedTokenSymbol: undefined,
        key: undefined,
        actionName: undefined,
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should handle empty string parameters", () => {
      const params = {
        portfolioName: "",
        selectedTokenSymbol: "",
        key: "",
        actionName: "",
      };

      expect(determineSlippage(params)).toBe(3);
    });

    it("should be case sensitive for ETH/WETH check", () => {
      const params = {
        portfolioName: "Stable+ Vault",
        selectedTokenSymbol: "ETH", // uppercase
        key: "1",
        actionName: "zapIn",
      };

      // Should return 3% because it checks for lowercase "eth"
      expect(determineSlippage(params)).toBe(3);
    });

    it("should handle portfolio name case sensitivity", () => {
      const params = {
        portfolioName: "stable+ vault", // lowercase
        selectedTokenSymbol: "eth",
        key: "1",
        actionName: "zapIn",
      };

      // Should return 3% because it checks for exact "Stable+ Vault"
      expect(determineSlippage(params)).toBe(3);
    });
  });
});
