import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

export default function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "default";
    const tokens = searchParams.get("tokens") || "0";
    const value = searchParams.get("value") || "0.00";
    const wallet = searchParams.get("wallet") || "";

    return new ImageResponse(
      (
        <div
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {type === "dust" && (
            <>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🧹</div>
              <div
                style={{ fontSize: 48, fontWeight: "bold", marginBottom: 16 }}
              >
                Dust Cleanup
              </div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {tokens} tokens • ${value}
              </div>
              <div style={{ fontSize: 18, opacity: 0.8 }}>
                {wallet
                  ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
                  : "Connect Wallet"}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 30,
                  fontSize: 16,
                  opacity: 0.7,
                }}
              >
                Powered by Zap Pilot
              </div>
            </>
          )}

          {type === "no-wallet" && (
            <>
              <div style={{ fontSize: 64, marginBottom: 20 }}>👛</div>
              <div
                style={{ fontSize: 48, fontWeight: "bold", marginBottom: 16 }}
              >
                Connect Wallet
              </div>
              <div style={{ fontSize: 24 }}>
                Link your wallet in Farcaster settings
              </div>
            </>
          )}

          {type === "clean" && (
            <>
              <div style={{ fontSize: 64, marginBottom: 20 }}>✨</div>
              <div
                style={{ fontSize: 48, fontWeight: "bold", marginBottom: 16 }}
              >
                All Clean!
              </div>
              <div style={{ fontSize: 24 }}>No dust tokens found</div>
            </>
          )}

          {type === "error" && (
            <>
              <div style={{ fontSize: 64, marginBottom: 20 }}>⚠️</div>
              <div
                style={{ fontSize: 48, fontWeight: "bold", marginBottom: 16 }}
              >
                Oops! Something went wrong
              </div>
              <div style={{ fontSize: 24 }}>Please try again later</div>
            </>
          )}

          {type === "default" && (
            <>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🧹</div>
              <div
                style={{ fontSize: 48, fontWeight: "bold", marginBottom: 16 }}
              >
                Dust Cleanup
              </div>
              <div style={{ fontSize: 24 }}>
                Clean up your wallet dust tokens
              </div>
            </>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.log(`Failed to generate image: ${e.message}`);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
