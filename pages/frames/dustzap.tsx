import React from "react";
import Head from "next/head";

const FRAME_BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

export default function DustZapFrame() {
  const frameImageUrl = `${FRAME_BASE_URL}/api/frames/image?type=default`;
  const framePostUrl = `${FRAME_BASE_URL}/api/frames/dustzap`;

  return (
    <>
      <Head>
        <title>Dust Cleanup - Zap Pilot Frame</title>
        <meta
          name="description"
          content="Clean up your wallet dust tokens in one click"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Dust Cleanup - Zap Pilot" />
        <meta
          property="og:description"
          content="Clean up your wallet dust tokens in one click"
        />
        <meta property="og:image" content={frameImageUrl} />

        {/* Farcaster Frame Meta Tags */}
        <meta name="fc:frame" content="vNext" />
        <meta name="fc:frame:image" content={frameImageUrl} />
        <meta name="fc:frame:post_url" content={framePostUrl} />
        <meta name="fc:frame:button:1" content="🔗 Check My Dust" />
      </Head>

      <div
        style={{
          padding: "40px",
          maxWidth: "600px",
          margin: "0 auto",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>🧹 Dust Cleanup Frame</h1>
        <p>
          This is a Farcaster Frame for cleaning up wallet dust tokens. Share
          this page in Farcaster to see the interactive frame!
        </p>

        <div
          style={{
            background: "#f5f5f5",
            padding: "20px",
            borderRadius: "8px",
            marginTop: "20px",
          }}
        >
          <h3>How it works:</h3>
          <ol>
            <li>Share this URL in a Farcaster cast</li>
            <li>
              Users will see an interactive frame showing their dust tokens
            </li>
            <li>
              Clicking "Clean My Dust" redirects to the full Zap Pilot app
            </li>
          </ol>
        </div>

        <div style={{ marginTop: "30px" }}>
          <a
            href="/dustzap"
            style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Try Full App →
          </a>
        </div>

        <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
          <p>
            <strong>For developers:</strong>
          </p>
          <p>
            Frame endpoint: <code>{framePostUrl}</code>
          </p>
          <p>
            Image endpoint: <code>{frameImageUrl}</code>
          </p>
        </div>
      </div>
    </>
  );
}
