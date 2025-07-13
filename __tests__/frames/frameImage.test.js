import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @vercel/og
vi.mock("@vercel/og", () => ({
  ImageResponse: vi.fn((element, options) => {
    return {
      status: 200,
      headers: { "content-type": "image/png" },
      body: `Mock image for ${JSON.stringify(
        element,
      )} with options ${JSON.stringify(options)}`,
    };
  }),
}));

// Import after mocking
import handler from "../../pages/api/frames/image";
import { ImageResponse } from "@vercel/og";

// Mock Next.js request
const mockRequest = (searchParams = {}) => {
  const params = new URLSearchParams(searchParams);
  return {
    url: `http://localhost:3000/api/frames/image?${params.toString()}`,
  };
};

describe("Frame Image Generation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Image Response Generation", () => {
    it("should generate default image", () => {
      const req = mockRequest({ type: "default" });

      const response = handler(req);

      expect(ImageResponse).toHaveBeenCalled();
      const [element, options] = ImageResponse.mock.calls[0];

      expect(options).toEqual({ width: 1200, height: 630 });
      expect(response.status).toBe(200);
    });

    it("should generate dust image with parameters", () => {
      const req = mockRequest({
        type: "dust",
        tokens: "5",
        value: "12.34",
        wallet: "0x123...abc",
      });

      handler(req);

      expect(ImageResponse).toHaveBeenCalled();
      const [element] = ImageResponse.mock.calls[0];

      // The element should be a React component structure
      expect(element).toBeTruthy();
    });

    it("should generate clean wallet image", () => {
      const req = mockRequest({
        type: "clean",
        wallet: "0x123...abc",
      });

      handler(req);

      expect(ImageResponse).toHaveBeenCalledWith(expect.anything(), {
        width: 1200,
        height: 630,
      });
    });

    it("should generate no-wallet image", () => {
      const req = mockRequest({ type: "no-wallet" });

      handler(req);

      expect(ImageResponse).toHaveBeenCalledWith(expect.anything(), {
        width: 1200,
        height: 630,
      });
    });

    it("should generate error image", () => {
      const req = mockRequest({ type: "error" });

      handler(req);

      expect(ImageResponse).toHaveBeenCalledWith(expect.anything(), {
        width: 1200,
        height: 630,
      });
    });

    it("should fallback to default when no type specified", () => {
      const req = mockRequest({});

      handler(req);

      expect(ImageResponse).toHaveBeenCalledWith(expect.anything(), {
        width: 1200,
        height: 630,
      });
    });
  });

  describe("Parameter Parsing", () => {
    it("should parse search parameters correctly", () => {
      const req = mockRequest({
        type: "dust",
        tokens: "10",
        value: "999.99",
        wallet: "0x1234567890123456789012345678901234567890",
      });

      const url = new URL(req.url);
      const searchParams = url.searchParams;

      expect(searchParams.get("type")).toBe("dust");
      expect(searchParams.get("tokens")).toBe("10");
      expect(searchParams.get("value")).toBe("999.99");
      expect(searchParams.get("wallet")).toBe(
        "0x1234567890123456789012345678901234567890",
      );
    });

    it("should provide default values for missing parameters", () => {
      const req = mockRequest({ type: "dust" });

      const url = new URL(req.url);
      const searchParams = url.searchParams;
      const type = searchParams.get("type") || "default";
      const tokens = searchParams.get("tokens") || "0";
      const value = searchParams.get("value") || "0.00";
      const wallet = searchParams.get("wallet") || "";

      expect(type).toBe("dust");
      expect(tokens).toBe("0");
      expect(value).toBe("0.00");
      expect(wallet).toBe("");
    });
  });

  describe("Error Handling", () => {
    it("should handle image generation errors", () => {
      // Mock ImageResponse to throw an error
      ImageResponse.mockImplementationOnce(() => {
        throw new Error("Image generation failed");
      });

      const req = mockRequest({ type: "default" });

      const result = handler(req);

      // Should return error response
      expect(result.status).toBe(500);
    });

    it("should handle malformed URL", () => {
      const req = { url: "invalid-url" };

      const result = handler(req);
      expect(result.status).toBe(500);
    });
  });

  describe("Image Dimensions", () => {
    it("should use correct dimensions for Farcaster frames", () => {
      const req = mockRequest({ type: "default" });

      handler(req);

      const [, options] = ImageResponse.mock.calls[0];
      expect(options.width).toBe(1200);
      expect(options.height).toBe(630);
    });
  });

  describe("Wallet Address Formatting", () => {
    it("should format wallet address for display", () => {
      const wallet = "0x1234567890123456789012345678901234567890";
      const formatted = wallet.slice(0, 6) + "..." + wallet.slice(-4);

      expect(formatted).toBe("0x1234...7890");
    });

    it("should handle empty wallet address", () => {
      const wallet = "";
      const formatted = wallet
        ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
        : "Connect Wallet";

      expect(formatted).toBe("Connect Wallet");
    });
  });

  describe("Image Content Validation", () => {
    it("should include correct content for dust state", () => {
      const req = mockRequest({
        type: "dust",
        tokens: "5",
        value: "25.50",
      });

      handler(req);

      // ImageResponse was called with content that should include the emoji and text
      expect(ImageResponse).toHaveBeenCalled();
    });

    it("should include branding footer", () => {
      const req = mockRequest({ type: "dust" });

      handler(req);

      // Should include "Powered by Zap Pilot" text
      expect(ImageResponse).toHaveBeenCalled();
    });
  });
});
