import logger from "./logger";
import LZString from "lz-string";
import { ethers } from "ethers";
import openNotificationWithIcon from "./notification.js";

/**
 * Stores compressed portfolio data via REST API
 * @param {string} key - The storage key
 * @param {string} compressedValue - The compressed data to store
 * @returns {Promise<boolean>} Returns true if storage was successful, false otherwise
 */
const storeViaAPI = async (key, compressedValue) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SDK_API_URL}/portfolio-cache`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          data: compressedValue,
          timestamp: Date.now(),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (e) {
    logger.error("Error storing data via API:", e);
    return false;
  }
};

/**
 * Safely stores portfolio data with compression
 * @param {string} key - The storage key
 * @param {Object} value - The data to store
 * @returns {Promise<boolean>} Returns true if storage was successful, false otherwise
 */
export const safeSetLocalStorage = async (key, value, notificationAPI) => {
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

    const compressedValue = LZString.compressToUTF16(JSON.stringify(cacheData));

    // Store via API instead of localStorage
    return await storeViaAPI(key, compressedValue);
  } catch (e) {
    openNotificationWithIcon(
      notificationAPI,
      "Error caching portfolio data",
      "error",
      "Failed to cache portfolio data",
    );
    logger.error("Error in safeSetLocalStorage:", e);
    return false;
  }
};

/**
 * Safely retrieves and decompresses portfolio data from API
 * @param {string} key - The storage key
 * @param {Object} portfolioHelper - The portfolio helper instance
 * @returns {Object|null} The retrieved data or null
 */
export const safeGetLocalStorage = async (
  key,
  portfolioHelper,
  notificationAPI,
) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SDK_API_URL}/portfolio-cache/${key}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const { data: compressed } = await response.json();
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
    logger.error("Error retrieving from API:", e);
    openNotificationWithIcon(
      notificationAPI,
      "Error getting portfolio data",
      "error",
      "Failed to get portfolio data",
    );
    return null;
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
