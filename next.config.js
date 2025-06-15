/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TESTING: Only transpile essential antd packages
  transpilePackages: ["antd", "rc-util"],
  trailingSlash: true,
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
          "**/.__tests__/**",
        ],
      };

      // TEST: Ignore heavy chart packages during module resolution
      config.resolve.alias = {
        ...config.resolve.alias,
        "@ant-design/charts": false,
        "@ant-design/graphs": false,
        "@ant-design/plots": false,
        "@antv/g2": false,
        "@antv/g6": false,
        "@antv/l7": false,
      };

      // Gentler memory reduction - keep basic functionality
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "async",
          cacheGroups: {
            default: false,
            vendors: false,
            // Only React core
            vendor: {
              name: "vendor",
              chunks: "all",
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 20,
            },
          },
        },
      };

      // Reduce cache but don't disable entirely
      config.cache = {
        type: "memory",
        maxGenerations: 1,
      };
    }

    return config;
  },
  experimental: {
    // TESTING: Only optimize basic antd, avoid charts
    optimizePackageImports: ["antd"],
  },
  images: {
    unoptimized: false,
  },
  basePath: "",
  assetPrefix: "/",
};

// TEMPORARILY DISABLE MEMORY-HEAVY PLUGINS FOR TESTING
// Comment out Sentry and PWA to test memory usage

// const { withSentryConfig } = require("@sentry/nextjs");
// const withPWA = require("next-pwa")({
//   dest: "public",
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === "development",
// });

// module.exports = withPWA(
//   withSentryConfig(
//     module.exports,
//     {
//       silent: true,
//       org: "all-weather-portfolio",
//       project: "webapp",
//     },
//     {
//       widenClientFileUpload: true,
//       transpileClientSDK: true,
//       tunnelRoute: "/monitoring",
//       hideSourceMaps: true,
//       disableLogger: true,
//     },
//   ),
// );

module.exports = nextConfig;
