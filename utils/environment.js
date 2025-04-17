// Create a new utility file for environment-related functions
export const isLocalEnvironment =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const getMinimumTokenAmount = (tokenSymbol, shouldSkipBridge) => {
  if (!tokenSymbol) return Infinity;
  if (shouldSkipBridge) return 1;

  const minimums = {
    production: {
      eth: 0.03,
      stablecoin: 100,
    },
    development: {
      eth: 0.0001,
      stablecoin: 1,
    },
  };

  const environment = isLocalEnvironment ? "development" : "production";
  const tokenType = tokenSymbol.toLowerCase().includes("eth")
    ? "eth"
    : "stablecoin";

  return minimums[environment][tokenType];
};
