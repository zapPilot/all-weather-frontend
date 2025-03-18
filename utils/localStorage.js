import LZString from "lz-string";
import { ethers } from "ethers";

/**
 * Safely stores portfolio data in localStorage with compression
 * @param {string} key - The localStorage key
 * @param {Object} value - The data to store
 */
export const safeSetLocalStorage = (key, value) => {
  try {
    const cacheData = {
      tokenPricesMappingTable: value.tokenPricesMappingTable,
      usdBalance: value.usdBalance,
      usdBalanceDict: value.usdBalanceDict,
      lockUpPeriod: value.lockUpPeriod,
      pendingRewards: value.pendingRewards,
      dust: {},
      timestamp: value.timestamp,
      __className: "PortfolioCache",
    };

    // Only store the uniqueId for protocol lookup
    if (value.dust) {
      Object.keys(value.dust).forEach((chain) => {
        if (value.dust[chain]) {
          cacheData.dust[chain] = {};
          Object.keys(value.dust[chain]).forEach((protocol) => {
            if (value.dust[chain][protocol]) {
              cacheData.dust[chain][protocol] = {
                assetBalance: value.dust[chain][protocol].assetBalance,
                assetUsdBalanceOf:
                  value.dust[chain][protocol].assetUsdBalanceOf,
                protocolId: value.dust[chain][protocol].protocol.uniqueId(),
              };
            }
          });
        }
      });
    }

    const compressedValue = LZString.compressToUTF16(JSON.stringify(cacheData));
    localStorage.setItem(key, compressedValue);
  } catch (e) {
    console.error("Error in safeSetLocalStorage:", e);
    throw e;
  }
};

/**
 * Safely retrieves and decompresses portfolio data from localStorage
 * @param {string} key - The localStorage key
 * @param {Object} portfolioHelper - The portfolio helper instance
 * @returns {Object|null} The retrieved data or null
 */
export const safeGetLocalStorage = (key, portfolioHelper) => {
  try {
    const compressed = localStorage.getItem(key);
    if (!compressed) {
      return null;
    }

    const decompressedData = JSON.parse(
      LZString.decompressFromUTF16(compressed),
    );

    if (decompressedData.__className === "PortfolioCache") {
      const { __className, ...cacheData } = decompressedData;

      // Reconstruct dust objects using protocolId
      if (cacheData.dust && portfolioHelper?.strategy) {
        Object.keys(cacheData.dust).forEach((chain) => {
          if (cacheData.dust[chain]) {
            Object.keys(cacheData.dust[chain]).forEach((protocol) => {
              if (cacheData.dust[chain][protocol]) {
                const cachedData = cacheData.dust[chain][protocol];
                const protocolId = cachedData.protocolId;

                // Find the protocol instance in portfolioHelper.strategy
                const protocolInstance = findProtocolByUniqueId(
                  protocolId,
                  portfolioHelper.strategy,
                );

                if (protocolInstance) {
                  cacheData.dust[chain][protocol] = {
                    assetBalance: ethers.BigNumber.from(
                      cachedData.assetBalance.hex,
                    ),
                    assetUsdBalanceOf: cachedData.assetUsdBalanceOf,
                    protocol: protocolInstance,
                  };
                }
              }
            });
          }
        });
      }
      // Reconstruct usdBalanceDict objects using protocolId
      if (cacheData.usdBalanceDict && portfolioHelper?.strategy) {
        Object.keys(cacheData.usdBalanceDict).forEach(
          (protocolIdWithClassName) => {
            const lastSlashIndex = protocolIdWithClassName.lastIndexOf("/");
            const protocolId = protocolIdWithClassName.substring(
              0,
              lastSlashIndex,
            );
            const cachedData =
              cacheData.usdBalanceDict[protocolIdWithClassName];

            // Find the protocol instance in portfolioHelper.strategy
            const protocolInstance = findProtocolByUniqueId(
              protocolId,
              portfolioHelper.strategy,
            );
            if (protocolInstance) {
              cacheData.usdBalanceDict[protocolIdWithClassName] = {
                ...cachedData,
                protocol: {
                  ...cachedData.protocol,
                  interface: protocolInstance,
                },
              };
            }
          },
        );
      }

      return cacheData;
    }

    return decompressedData;
  } catch (e) {
    console.error("Error retrieving from localStorage:", e);
    throw e;
  }
};

/**
 * Helper function to find protocol by uniqueId in strategy
 * @param {string} targetId - The protocol unique ID to find
 * @param {Object} strategy - The strategy object
 * @returns {Object|null} The protocol instance or null
 */
const findProtocolByUniqueId = (targetId, strategy) => {
  for (const allocation of Object.values(strategy)) {
    for (const chainData of Object.values(allocation)) {
      for (const protocolData of chainData) {
        if (protocolData.interface.uniqueId() === targetId) {
          return protocolData.interface;
        }
      }
    }
  }
  return null;
};