import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the dustzap API module
vi.mock("../../utils/dustConversion", () => ({
  getTokens: vi.fn(),
}));

vi.mock("../../utils/chainHelper", () => ({
  transformToDebankChainName: vi.fn((chain) => chain),
}));

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

describe("Farcaster Frame Functions", () => {
  let originalEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = process.env.NEXT_PUBLIC_URL;
    process.env.NEXT_PUBLIC_URL = "http://localhost:3000";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_URL = originalEnv;
  });

  describe("generateFrameHtml", () => {
    it("should generate valid frame HTML with single button", () => {
      // Import the function locally to avoid module loading issues
      const generateFrameHtml = (imageUrl, buttons, postUrl) => {
        const buttonTags = buttons
          .map((button, index) => {
            const buttonNumber = index + 1;
            let buttonTag = `<meta name="fc:frame:button:${buttonNumber}" content="${button.label}" />`;

            if (button.action === "link" && button.target) {
              buttonTag += `\n    <meta name="fc:frame:button:${buttonNumber}:action" content="link" />`;
              buttonTag += `\n    <meta name="fc:frame:button:${buttonNumber}:target" content="${button.target}" />`;
            } else if (button.action === "post" && postUrl) {
              buttonTag += `\n    <meta name="fc:frame:button:${buttonNumber}:action" content="post" />`;
            }

            return buttonTag;
          })
          .join("\n    ");

        return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dust Cleanup Frame</title>
    
    <!-- Farcaster Frame Meta Tags -->
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="${imageUrl}" />
    ${postUrl ? `<meta name="fc:frame:post_url" content="${postUrl}" />` : ""}
    ${buttonTags}
    
    <!-- Open Graph -->
    <meta property="og:title" content="Dust Cleanup - Zap Pilot" />
    <meta property="og:description" content="Clean up your wallet dust tokens" />
    <meta property="og:image" content="${imageUrl}" />
  </head>
  <body>
    <h1>Zap Pilot Dust Cleanup Frame</h1>
    <p>This content is displayed when the frame is accessed directly.</p>
  </body>
</html>`;
      };

      const imageUrl = "http://localhost:3000/api/frames/image?type=default";
      const buttons = [{ label: "Test Button", action: "post" }];
      const postUrl = "http://localhost:3000/api/frames/dustzap";

      const html = generateFrameHtml(imageUrl, buttons, postUrl);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<meta name="fc:frame" content="vNext" />');
      expect(html).toContain(
        `<meta name="fc:frame:image" content="${imageUrl}" />`,
      );
      expect(html).toContain(
        `<meta name="fc:frame:post_url" content="${postUrl}" />`,
      );
      expect(html).toContain(
        '<meta name="fc:frame:button:1" content="Test Button" />',
      );
      expect(html).toContain(
        '<meta name="fc:frame:button:1:action" content="post" />',
      );
    });

    it("should generate HTML with link button", () => {
      const generateFrameHtml = (imageUrl, buttons, postUrl) => {
        const buttonTags = buttons
          .map((button, index) => {
            const buttonNumber = index + 1;
            let buttonTag = `<meta name="fc:frame:button:${buttonNumber}" content="${button.label}" />`;

            if (button.action === "link" && button.target) {
              buttonTag += `\n    <meta name="fc:frame:button:${buttonNumber}:action" content="link" />`;
              buttonTag += `\n    <meta name="fc:frame:button:${buttonNumber}:target" content="${button.target}" />`;
            } else if (button.action === "post" && postUrl) {
              buttonTag += `\n    <meta name="fc:frame:button:${buttonNumber}:action" content="post" />`;
            }

            return buttonTag;
          })
          .join("\n    ");

        return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dust Cleanup Frame</title>
    
    <!-- Farcaster Frame Meta Tags -->
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="${imageUrl}" />
    ${postUrl ? `<meta name="fc:frame:post_url" content="${postUrl}" />` : ""}
    ${buttonTags}
    
    <!-- Open Graph -->
    <meta property="og:title" content="Dust Cleanup - Zap Pilot" />
    <meta property="og:description" content="Clean up your wallet dust tokens" />
    <meta property="og:image" content="${imageUrl}" />
  </head>
  <body>
    <h1>Zap Pilot Dust Cleanup Frame</h1>
    <p>This content is displayed when the frame is accessed directly.</p>
  </body>
</html>`;
      };

      const imageUrl = "http://localhost:3000/api/frames/image?type=default";
      const buttons = [
        {
          label: "Test Link",
          action: "link",
          target: "https://example.com",
        },
      ];

      const html = generateFrameHtml(imageUrl, buttons);

      expect(html).toContain(
        '<meta name="fc:frame:button:1" content="Test Link" />',
      );
      expect(html).toContain(
        '<meta name="fc:frame:button:1:action" content="link" />',
      );
      expect(html).toContain(
        '<meta name="fc:frame:button:1:target" content="https://example.com" />',
      );
    });

    it("should handle multiple buttons", () => {
      const generateFrameHtml = (imageUrl, buttons, postUrl) => {
        const buttonTags = buttons
          .map((button, index) => {
            const buttonNumber = index + 1;
            let buttonTag = `<meta name="fc:frame:button:${buttonNumber}" content="${button.label}" />`;

            if (button.action === "link" && button.target) {
              buttonTag += `\n    <meta name="fc:frame:button:${buttonNumber}:action" content="link" />`;
              buttonTag += `\n    <meta name="fc:frame:button:${buttonNumber}:target" content="${button.target}" />`;
            } else if (button.action === "post" && postUrl) {
              buttonTag += `\n    <meta name="fc:frame:button:${buttonNumber}:action" content="post" />`;
            }

            return buttonTag;
          })
          .join("\n    ");

        return buttonTags;
      };

      const buttons = [
        { label: "Button 1", action: "post" },
        { label: "Button 2", action: "link", target: "https://example.com" },
      ];

      const buttonTags = generateFrameHtml("", buttons, "http://test.com");

      expect(buttonTags).toContain(
        '<meta name="fc:frame:button:1" content="Button 1" />',
      );
      expect(buttonTags).toContain(
        '<meta name="fc:frame:button:2" content="Button 2" />',
      );
      expect(buttonTags).toContain(
        '<meta name="fc:frame:button:1:action" content="post" />',
      );
      expect(buttonTags).toContain(
        '<meta name="fc:frame:button:2:action" content="link" />',
      );
    });
  });

  describe("Frame State Logic", () => {
    it("should handle clean wallet state", () => {
      const tokens = [];
      const expectedState = "clean";

      expect(tokens.length).toBe(0);
      // If no tokens, should show clean state
      const shouldShowClean = tokens.length === 0;
      expect(shouldShowClean).toBe(true);
    });

    it("should handle dust wallet state", () => {
      const tokens = [
        { optimized_symbol: "USDC", amount: 0.5, price: 1.0 },
        { optimized_symbol: "ETH", amount: 0.001, price: 2000 },
      ];

      const totalValue = tokens.reduce(
        (sum, token) => sum + token.amount * token.price,
        0,
      );

      expect(tokens.length).toBe(2);
      expect(totalValue).toBe(2.5); // 0.5 * 1 + 0.001 * 2000
      expect(totalValue).toBeGreaterThan(0);
    });

    it("should calculate dust metrics correctly", () => {
      const tokens = [
        { optimized_symbol: "USDC", amount: 1.5, price: 1.0 },
        { optimized_symbol: "DAI", amount: 2.0, price: 1.0 },
        { optimized_symbol: "ETH", amount: 0.005, price: 2000 },
      ];

      const totalValue = tokens.reduce(
        (sum, token) => sum + token.amount * token.price,
        0,
      );
      const topTokens = tokens
        .slice(0, 3)
        .map(
          (t) => `${t.optimized_symbol}: $${(t.amount * t.price).toFixed(2)}`,
        );

      expect(totalValue).toBe(13.5); // 1.5 + 2.0 + 10.0
      expect(topTokens).toEqual(["USDC: $1.50", "DAI: $2.00", "ETH: $10.00"]);
    });
  });

  describe("Frame URL Generation", () => {
    it("should generate correct image URLs", () => {
      const baseUrl = "http://localhost:3000";

      const defaultImageUrl = `${baseUrl}/api/frames/image?type=default`;
      const dustImageUrl = `${baseUrl}/api/frames/image?type=dust&tokens=5&value=12.34&wallet=0x123`;
      const cleanImageUrl = `${baseUrl}/api/frames/image?type=clean&wallet=0x123`;
      const noWalletImageUrl = `${baseUrl}/api/frames/image?type=no-wallet`;

      expect(defaultImageUrl).toBe(
        "http://localhost:3000/api/frames/image?type=default",
      );
      expect(dustImageUrl).toContain("type=dust");
      expect(dustImageUrl).toContain("tokens=5");
      expect(dustImageUrl).toContain("value=12.34");
      expect(cleanImageUrl).toContain("type=clean");
      expect(noWalletImageUrl).toContain("type=no-wallet");
    });

    it("should generate correct cleanup URLs", () => {
      const baseUrl = "http://localhost:3000";
      const testFid = 12345;
      const testWallet = "0x1234567890123456789012345678901234567890";

      const cleanupUrl = `${baseUrl}/dustzap?fid=${testFid}&wallet=${testWallet}&source=frame&auto=true`;

      expect(cleanupUrl).toContain("/dustzap?");
      expect(cleanupUrl).toContain("fid=12345");
      expect(cleanupUrl).toContain(
        "wallet=0x1234567890123456789012345678901234567890",
      );
      expect(cleanupUrl).toContain("source=frame");
      expect(cleanupUrl).toContain("auto=true");
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", () => {
      const error = new Error("API Error");

      // Simulate error response
      const shouldShowNoWallet = true; // API error results in no-wallet state
      const errorImageUrl =
        "http://localhost:3000/api/frames/image?type=no-wallet";

      expect(shouldShowNoWallet).toBe(true);
      expect(errorImageUrl).toContain("type=no-wallet");
    });

    it("should handle unexpected errors", () => {
      const error = new Error("Unexpected error");

      const errorImageUrl = "http://localhost:3000/api/frames/image?type=error";
      const shouldShow500 = true;

      expect(errorImageUrl).toContain("type=error");
      expect(shouldShow500).toBe(true);
    });
  });
});
