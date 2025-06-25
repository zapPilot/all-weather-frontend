import { describe, it, expect, vi } from "vitest";

// Mock thirdweb
vi.mock("thirdweb", () => ({
  createThirdwebClient: vi.fn(() => "mock-client"),
}));

describe("thirdweb", () => {
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
    });
  });
});
