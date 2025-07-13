import { NextApiRequest, NextApiResponse } from "next";
import { getTokens } from "../../../utils/dustConversion";
import { transformToDebankChainName } from "../../../utils/chainHelper";

const FRAME_BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// Simple Frame HTML response generator
function generateFrameHtml(
  imageUrl: string,
  buttons: Array<{ label: string; action: string; target?: string }>,
  postUrl?: string,
) {
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
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  console.log("📡 Frame GET request received");

  // Initial frame load (no interaction yet)
  const imageUrl = `${FRAME_BASE_URL}/api/frames/image?type=default`;
  const postUrl = `${FRAME_BASE_URL}/api/frames/dustzap`;

  const html = generateFrameHtml(
    imageUrl,
    [{ label: "🔗 Check My Dust", action: "post" }],
    postUrl,
  );

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("📨 Frame POST request received");

    const body = req.body;
    console.log("📊 Request body:", JSON.stringify(body, null, 2));

    // For MVP, we'll simulate a user with a test wallet
    // In a real implementation, you'd validate the Farcaster message signature
    const testWalletAddress = "0x1234567890123456789012345678901234567890"; // Test wallet
    const testFid = 12345;

    console.log("🔍 Fetching tokens for test wallet:", testWalletAddress);

    try {
      // Reuse existing dustConversion logic
      const tokens = await getTokens(
        transformToDebankChainName("arbitrum"),
        testWalletAddress,
      );

      const totalValue = tokens.reduce(
        (sum, token) => sum + token.amount * token.price,
        0,
      );

      console.log("📊 Dust analysis:", {
        tokenCount: tokens.length,
        totalValue: totalValue.toFixed(4),
        topTokens: tokens
          .slice(0, 3)
          .map(
            (t) => `${t.optimized_symbol}: $${(t.amount * t.price).toFixed(2)}`,
          ),
      });

      // Handle clean wallet case
      if (tokens.length === 0) {
        const cleanImageUrl = `${FRAME_BASE_URL}/api/frames/image?type=clean&wallet=${testWalletAddress}`;
        const html = generateFrameHtml(cleanImageUrl, [
          {
            label: "✨ Portfolio Clean!",
            action: "link",
            target: FRAME_BASE_URL,
          },
        ]);
        res.setHeader("Content-Type", "text/html");
        return res.status(200).send(html);
      }

      // Main dust overview frame
      const dustImageUrl =
        `${FRAME_BASE_URL}/api/frames/image?` +
        `type=dust&tokens=${tokens.length}&value=${totalValue.toFixed(
          2,
        )}&wallet=${testWalletAddress}`;

      // Create cleanup URL with frame context
      const cleanupUrl =
        `${FRAME_BASE_URL}/dustzap?` +
        `fid=${testFid}&wallet=${testWalletAddress}&source=frame&auto=true`;

      console.log("🎯 Generated cleanup URL:", cleanupUrl);

      const html = generateFrameHtml(dustImageUrl, [
        { label: "🧹 Clean My Dust", action: "link", target: cleanupUrl },
        {
          label: "📊 View Details",
          action: "link",
          target: `${FRAME_BASE_URL}/dustzap`,
        },
      ]);

      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(html);
    } catch (apiError) {
      console.error("💥 API Error:", apiError);

      // Return no-wallet frame for API errors (simulating user without verified wallet)
      const noWalletImageUrl = `${FRAME_BASE_URL}/api/frames/image?type=no-wallet`;
      const html = generateFrameHtml(noWalletImageUrl, [
        {
          label: "👛 Connect Wallet",
          action: "link",
          target: "https://warpcast.com/~/settings/verified-addresses",
        },
      ]);
      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(html);
    }
  } catch (error) {
    console.error("💥 Frame handler error:", error);

    const errorImageUrl = `${FRAME_BASE_URL}/api/frames/image?type=error`;
    const html = generateFrameHtml(
      errorImageUrl,
      [{ label: "🔄 Try Again", action: "post" }],
      `${FRAME_BASE_URL}/api/frames/dustzap`,
    );

    res.setHeader("Content-Type", "text/html");
    return res.status(500).send(html);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    return await handleGet(req, res);
  } else if (req.method === "POST") {
    return await handlePost(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
