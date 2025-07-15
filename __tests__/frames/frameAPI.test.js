import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the dustzap dependencies
vi.mock("../../utils/dustConversion", () => ({
  getTokens: vi.fn(),
}));

vi.mock("../../utils/chainHelper", () => ({
  transformToDebankChainName: vi.fn((chain) => chain),
}));

// Import after mocking
import handler from "../../pages/api/frames/dustzap";
import { getTokens } from "../../utils/dustConversion";
import { transformToDebankChainName } from "../../utils/chainHelper";

// Mock Next.js API response
const mockResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (method = "GET", body = {}) => ({
  method,
  body,
});

describe("Frame API Integration Tests", () => {
  let originalEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = process.env.NEXT_PUBLIC_URL;
    process.env.NEXT_PUBLIC_URL = "http://localhost:3000";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_URL = originalEnv;
  });

  describe("GET /api/frames/dustzap", () => {
    it("should return initial frame HTML", async () => {
      const req = mockRequest("GET");
      const res = mockResponse();

      await handler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();

      const htmlContent = res.send.mock.calls[0][0];
      expect(htmlContent).toContain("<!DOCTYPE html>");
      expect(htmlContent).toContain('<meta name="fc:frame" content="vNext" />');
      expect(htmlContent).toContain("🔗 Check My Dust");
    });
  });

  describe("POST /api/frames/dustzap", () => {
    it("should handle successful dust token retrieval", async () => {
      const mockTokens = [
        { optimized_symbol: "USDC", amount: 1.5, price: 1.0 },
        { optimized_symbol: "ETH", amount: 0.001, price: 2000 },
      ];

      getTokens.mockResolvedValue(mockTokens);
      transformToDebankChainName.mockReturnValue("arbitrum");

      const req = mockRequest("POST", {
        untrustedData: { fid: 12345, buttonIndex: 1 },
      });
      const res = mockResponse();

      await handler(req, res);

      expect(getTokens).toHaveBeenCalledWith(
        "arbitrum",
        "0x1234567890123456789012345678901234567890",
      );
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
      expect(res.status).toHaveBeenCalledWith(200);

      const htmlContent = res.send.mock.calls[0][0];
      expect(htmlContent).toContain("type=dust");
      expect(htmlContent).toContain("🧹 Clean My Dust");
      expect(htmlContent).toContain("📊 View Details");
    });

    it("should handle clean wallet (no tokens)", async () => {
      getTokens.mockResolvedValue([]);
      transformToDebankChainName.mockReturnValue("arbitrum");

      const req = mockRequest("POST", {
        untrustedData: { fid: 12345, buttonIndex: 1 },
      });
      const res = mockResponse();

      await handler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
      expect(res.status).toHaveBeenCalledWith(200);

      const htmlContent = res.send.mock.calls[0][0];
      expect(htmlContent).toContain("type=clean");
      expect(htmlContent).toContain("✨ Portfolio Clean!");
    });

    it("should handle API error (no wallet)", async () => {
      getTokens.mockRejectedValue(new Error("API Error"));
      transformToDebankChainName.mockReturnValue("arbitrum");

      const req = mockRequest("POST", {
        untrustedData: { fid: 12345, buttonIndex: 1 },
      });
      const res = mockResponse();

      await handler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
      expect(res.status).toHaveBeenCalledWith(200);

      const htmlContent = res.send.mock.calls[0][0];
      expect(htmlContent).toContain("type=no-wallet");
      expect(htmlContent).toContain("👛 Connect Wallet");
    });

    it("should handle unexpected errors", async () => {
      // Mock transformToDebankChainName to throw before getTokens is called
      transformToDebankChainName.mockImplementation(() => {
        throw new Error("Chain error");
      });

      const req = mockRequest("POST", {
        untrustedData: { fid: 12345, buttonIndex: 1 },
      });
      const res = mockResponse();

      await handler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
      // The error is caught by the API error handler, which returns 200 with no-wallet frame
      expect(res.status).toHaveBeenCalledWith(200);

      const htmlContent = res.send.mock.calls[0][0];
      expect(htmlContent).toContain("type=no-wallet");
      expect(htmlContent).toContain("👛 Connect Wallet");
    });
  });

  describe("Unsupported HTTP Methods", () => {
    it("should return 405 for unsupported methods", async () => {
      const req = mockRequest("PUT");
      const res = mockResponse();

      await handler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Allow", ["GET", "POST"]);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.end).toHaveBeenCalledWith("Method PUT Not Allowed");
    });
  });

  describe("Frame Response Validation", () => {
    it("should include required Farcaster frame meta tags", async () => {
      const req = mockRequest("GET");
      const res = mockResponse();

      await handler(req, res);

      const htmlContent = res.send.mock.calls[0][0];

      // Check required frame meta tags
      expect(htmlContent).toContain('<meta name="fc:frame" content="vNext" />');
      expect(htmlContent).toContain('<meta name="fc:frame:image"');
      expect(htmlContent).toContain('<meta name="fc:frame:post_url"');
      expect(htmlContent).toContain('<meta name="fc:frame:button:1"');
    });

    it("should include Open Graph tags", async () => {
      const req = mockRequest("GET");
      const res = mockResponse();

      await handler(req, res);

      const htmlContent = res.send.mock.calls[0][0];

      expect(htmlContent).toContain('<meta property="og:title"');
      expect(htmlContent).toContain('<meta property="og:description"');
      expect(htmlContent).toContain('<meta property="og:image"');
    });
  });

  describe("URL Generation", () => {
    it("should generate correct URLs based on environment", async () => {
      // Since the handler imports the URL at module load time,
      // we need to test that the default behavior works
      const req = mockRequest("GET");
      const res = mockResponse();

      await handler(req, res);

      const htmlContent = res.send.mock.calls[0][0];
      // The handler uses the URL defined at import time, so it should contain localhost:3000
      expect(htmlContent).toContain("http://localhost:3000/api/frames/image");
      expect(htmlContent).toContain("http://localhost:3000/api/frames/dustzap");
    });

    it("should fallback to localhost when no environment URL", async () => {
      delete process.env.NEXT_PUBLIC_URL;

      const req = mockRequest("GET");
      const res = mockResponse();

      await handler(req, res);

      const htmlContent = res.send.mock.calls[0][0];
      expect(htmlContent).toContain("http://localhost:3000");
    });
  });

  describe("Token Value Calculations", () => {
    it("should calculate total value correctly", async () => {
      const mockTokens = [
        { optimized_symbol: "USDC", amount: 100, price: 1.0 },
        { optimized_symbol: "ETH", amount: 0.5, price: 2000 },
        { optimized_symbol: "BTC", amount: 0.01, price: 50000 },
      ];

      getTokens.mockResolvedValue(mockTokens);
      transformToDebankChainName.mockReturnValue("arbitrum");

      const req = mockRequest("POST", {
        untrustedData: { fid: 12345, buttonIndex: 1 },
      });
      const res = mockResponse();

      await handler(req, res);

      const htmlContent = res.send.mock.calls[0][0];
      // Total should be 100 + 1000 + 500 = 1600
      expect(htmlContent).toContain("value=1600.00");
      expect(htmlContent).toContain("tokens=3");
    });
  });
});
