import logger from "../utils/logger";
import axios from "axios";

class PriceService {
  static WUSDCN_TIMESTAMP = 1745843805; // Reference timestamp for wausdcn
  static WUSDCN_BASE_PRICE = 1.1281610094;

  static get STATIC_PRICES() {
    return {
      usd: 1,
      usdc: 1,
      usdt: 1,
      ousdt: 1,
      dai: 1,
      frax: 0.997,
      usde: 1,
      gho: 0.9986,
      get wausdcn() {
        return calculateDynamicPrice(
          PriceService.WUSDCN_BASE_PRICE,
          PriceService.WUSDCN_TIMESTAMP,
        );
      },
    };
  }

  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async fetchPrice(token, priceID) {
    const { key, provider, uniqueId } = this._getPriceServiceInfo(priceID);

    // Check static prices first
    if (token.toLowerCase() in PriceService.STATIC_PRICES) {
      return PriceService.STATIC_PRICES[token.toLowerCase()];
    }

    try {
      const endpoint = this._buildEndpoint(provider, key);
      const response = await axios.get(endpoint, {
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 500,
      });

      if (response.data?.price != null) {
        return response.data.price;
      }
      throw new Error("Invalid price data received");
    } catch (error) {
      logger.error(`Failed to fetch price for ${token}:`, error.message);
      return this._getFallbackPrice(token);
    }
  }

  _getFallbackPrice(token) {
    return PriceService.STATIC_PRICES[token.toLowerCase()] || null;
  }

  _getPriceServiceInfo(priceID) {
    if (priceID?.coinmarketcapApiId) {
      return {
        key: priceID.coinmarketcapApiId,
        provider: "coinmarketcap",
        uniqueId: priceID.coinmarketcapApiId,
      };
    } else if (priceID?.geckoterminal) {
      return {
        key: priceID.geckoterminal,
        provider: "geckoterminal",
        uniqueId: priceID.geckoterminal.chain + priceID.geckoterminal.address,
      };
    }
    throw new Error(`Invalid price ID format: ${JSON.stringify(priceID)}`);
  }

  _buildEndpoint(provider, key) {
    if (provider === "coinmarketcap") {
      return `${this.apiUrl}/token/${key}/price`;
    } else if (provider === "geckoterminal") {
      return `${this.apiUrl}/token/${key.chain}/${key.address}/price`;
    }
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

class TokenPriceBatcher {
  constructor(priceService) {
    this.priceService = priceService;
  }

  async fetchPrices(tokensToFetch) {
    const prices = { ...PriceService.STATIC_PRICES };
    const promises = tokensToFetch.map(async ([token, priceID]) => {
      const price = await this.priceService.fetchPrice(token, priceID);
      prices[token] = price;
    });

    await Promise.all(promises);

    // Check for zero prices
    const zeroPriceTokens = Object.entries(prices)
      .filter(([_, price]) => price === 0)
      .map(([token]) => token);

    if (zeroPriceTokens.length > 0) {
      throw new Error(
        `Prices not found for tokens: ${zeroPriceTokens.join(", ")}`,
      );
    }

    return prices;
  }
}

const calculateDynamicPrice = (basePrice, timestamp, apr = 0.02) => {
  // Convert APR to daily rate
  const dailyRate = Math.pow(1 + apr, 1 / 365) - 1;

  // Calculate number of days from timestamp to now
  const now = Math.floor(Date.now() / 1000); // current timestamp in seconds
  const days = (now - timestamp) / (24 * 60 * 60); // convert seconds to days

  // Calculate new price with compound interest
  const newPrice = basePrice * Math.pow(1 + dailyRate, days);

  return newPrice;
};

export { TokenPriceBatcher, PriceService };
