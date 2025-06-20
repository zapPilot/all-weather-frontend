/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["antd", "rc-util", "rc-pagination", "rc-picker"],
  trailingSlash: true,
  // === ADD THIS LINE BACK ===
  output: isDev ? "standalone" : "export",
  // ==========================
  webpack: (config, { dev }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };

    // Memory optimizations for development
    if (dev) {
      config.watchOptions = {
        poll: false,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/coverage/**",
          "**/out/**",
          "**/__tests__/**",
        ],
      };

      // DEV ONLY: Ignore heavy chart packages during module resolution
      // This reduces memory usage by ~340MB in development
      config.resolve.alias = {
        ...config.resolve.alias,
        "@ant-design/charts": false,
        "@ant-design/graphs": false,
        "@ant-design/plots": false,
        "@antv/g2": false,
        "@antv/g6": false,
        "@antv/l7": false,
      };

      // Memory-optimized chunk splitting for development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "async",
          cacheGroups: {
            default: false,
            vendors: false,
            // Only React core in vendor chunk
            vendor: {
              name: "vendor",
              chunks: "all",
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 20,
            },
          },
        },
      };

      // Reduce cache usage in development
      config.cache = {
        type: "memory",
        maxGenerations: 1,
      };
    }

    return config;
  },
  experimental: {
    // Memory optimization for antd
    optimizePackageImports: ["antd"],
    webVitalsAttribution: ["CLS", "LCP"],
  },
  images: {
    unoptimized: isDev ? false : true,
  },
  basePath: "", // Keep this if you're deploying to the root of your GitHub Pages domain (e.g., username.github.io)
  assetPrefix: "/", // Keep this
};

// Production plugins - Sentry and PWA
const { withSentryConfig } = require("@sentry/nextjs");
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDev, // Disabled in dev for memory
});

module.exports = withPWA(
  withSentryConfig(
    nextConfig,
    {
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options

      // Suppresses source map uploading logs during build
      silent: true,
      org: "all-weather-portfolio",
      project: "webapp",
    },
    {
      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Transpiles SDK to be compatible with IE11 (increases bundle size)
      transpileClientSDK: true,

      // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
      tunnelRoute: "/monitoring",

      // Hides source maps from generated client bundles
      hideSourceMaps: true,

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,
    },
  ),
);
