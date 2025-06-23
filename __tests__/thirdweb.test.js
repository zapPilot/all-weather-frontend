import { describe, it, expect, vi } from "vitest";

// Mock thirdweb
vi.mock("thirdweb", () => ({
  createThirdwebClient: vi.fn(() => "mock-client"),
}));

describe("thirdweb", () => {
  describe("verifyBatchHash", () => {
    it("should export verifyBatchHash function", async () => {
      const { verifyBatchHash } = await import("../utils/thirdweb");
      expect(verifyBatchHash).toBeDefined();
      expect(typeof verifyBatchHash).toBe("function");
    });

    it("should calculate hash for valid user operations", async () => {
      const { verifyBatchHash } = await import("../utils/thirdweb");

      const mockUserOps = [
        {
          sender: "0x1234567890123456789012345678901234567890",
          nonce: 1,
          initCode: "0x",
          callData: "0xabcdef",
          callGasLimit: 100000,
          verificationGasLimit: 50000,
          preVerificationGas: 21000,
          maxFeePerGas: 20000000000,
          maxPriorityFeePerGas: 1000000000,
          paymasterAndData: "0x",
          signature: "0x",
        },
      ];
      const mockEntryPoint = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
      const mockChainId = 1;

      const result = verifyBatchHash(mockUserOps, mockEntryPoint, mockChainId);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/); // Valid hex hash
    });

    it("should handle empty user operations array", async () => {
      const { verifyBatchHash } = await import("../utils/thirdweb");

      const result = verifyBatchHash(
        [],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        1,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should produce different hashes for different inputs", async () => {
      const { verifyBatchHash } = await import("../utils/thirdweb");

      const userOp1 = {
        sender: "0x1234567890123456789012345678901234567890",
        nonce: 1,
        initCode: "0x",
        callData: "0xabcdef",
        callGasLimit: 100000,
        verificationGasLimit: 50000,
        preVerificationGas: 21000,
        maxFeePerGas: 20000000000,
        maxPriorityFeePerGas: 1000000000,
        paymasterAndData: "0x",
        signature: "0x",
      };

      const userOp2 = { ...userOp1, nonce: 2 };

      const hash1 = verifyBatchHash(
        [userOp1],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        1,
      );
      const hash2 = verifyBatchHash(
        [userOp2],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        1,
      );

      expect(hash1).not.toBe(hash2);
    });

    it("should produce different hashes for different chain IDs", async () => {
      const { verifyBatchHash } = await import("../utils/thirdweb");

      const userOp = {
        sender: "0x1234567890123456789012345678901234567890",
        nonce: 1,
        initCode: "0x",
        callData: "0xabcdef",
        callGasLimit: 100000,
        verificationGasLimit: 50000,
        preVerificationGas: 21000,
        maxFeePerGas: 20000000000,
        maxPriorityFeePerGas: 1000000000,
        paymasterAndData: "0x",
        signature: "0x",
      };

      const hash1 = verifyBatchHash(
        [userOp],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        1,
      );
      const hash2 = verifyBatchHash(
        [userOp],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        42161,
      );

      expect(hash1).not.toBe(hash2);
    });

    it("should handle multiple user operations", async () => {
      const { verifyBatchHash } = await import("../utils/thirdweb");

      const userOp1 = {
        sender: "0x1234567890123456789012345678901234567890",
        nonce: 1,
        initCode: "0x",
        callData: "0xabcdef",
        callGasLimit: 100000,
        verificationGasLimit: 50000,
        preVerificationGas: 21000,
        maxFeePerGas: 20000000000,
        maxPriorityFeePerGas: 1000000000,
        paymasterAndData: "0x",
        signature: "0x",
      };

      const userOp2 = { ...userOp1, nonce: 2 };

      const singleHash = verifyBatchHash(
        [userOp1],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        1,
      );
      const batchHash = verifyBatchHash(
        [userOp1, userOp2],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        1,
      );

      expect(singleHash).not.toBe(batchHash);
      expect(batchHash).toBeDefined();
      expect(typeof batchHash).toBe("string");
      expect(batchHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should handle user operations with zero values", async () => {
      const { verifyBatchHash } = await import("../utils/thirdweb");

      const zeroUserOp = {
        sender: "0x0000000000000000000000000000000000000000",
        nonce: 0,
        initCode: "0x",
        callData: "0x",
        callGasLimit: 0,
        verificationGasLimit: 0,
        preVerificationGas: 0,
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0,
        paymasterAndData: "0x",
        signature: "0x",
      };

      const result = verifyBatchHash(
        [zeroUserOp],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        1,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should be deterministic for same inputs", async () => {
      const { verifyBatchHash } = await import("../utils/thirdweb");

      const userOp = {
        sender: "0x1234567890123456789012345678901234567890",
        nonce: 1,
        initCode: "0x",
        callData: "0xabcdef",
        callGasLimit: 100000,
        verificationGasLimit: 50000,
        preVerificationGas: 21000,
        maxFeePerGas: 20000000000,
        maxPriorityFeePerGas: 1000000000,
        paymasterAndData: "0x",
        signature: "0x",
      };

      const hash1 = verifyBatchHash(
        [userOp],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        1,
      );
      const hash2 = verifyBatchHash(
        [userOp],
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        1,
      );

      expect(hash1).toBe(hash2);
    });
  });

  describe("THIRDWEB_CLIENT", () => {
    it("should create and export thirdweb client", async () => {
      const thirdwebModule = await import("../utils/thirdweb");
      const client = thirdwebModule.default;

      expect(client).toBeDefined();
      expect(client).toBe("mock-client");
    });

    it("should create client with environment variable", async () => {
      const { createThirdwebClient } = await import("thirdweb");

      expect(createThirdwebClient).toHaveBeenCalledWith({
        clientId: expect.any(String),
      });
    });
  });

  describe("module structure", () => {
    it("should export expected functions and constants", async () => {
      const thirdwebModule = await import("../utils/thirdweb");

      expect(thirdwebModule.default).toBeDefined(); // THIRDWEB_CLIENT
      expect(thirdwebModule.verifyBatchHash).toBeDefined();
      expect(typeof thirdwebModule.verifyBatchHash).toBe("function");
    });
  });
});
