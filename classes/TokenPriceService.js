import axios from "axios";

// Add global cache at the top of the file
const GLOBAL_PRICE_CACHE = {
  prices: {},
  lastUpdated: 0,
  CACHE_DURATION: 60000, // Cache duration in milliseconds (1 minute)
};

// Add global queue at the top of the file
const GLOBAL_QUEUE = {
  queue: new Map(), // Map of token -> Promise
  processing: false,
  QUEUE_PROCESS_INTERVAL: 2000, // Process queue every 2 seconds
};

class PriceService {
  static STATIC_PRICES = {
    usd: 1,
    usdc: 1,
    usdt: 1,
    dai: 1,
    frax: 0.997,
    usde: 1,
    usdx: 0.9971,
    gho: 0.9986,
    susd: 0.9837,
  };

  static MAX_RETRIES = 3;
  static RETRY_DELAY = 5000;
  static TIMEOUT = 30000;

  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async fetchPrice(token, priceID) {
    const { key, provider, uniqueId } = this._getPriceServiceInfo(priceID);

    // Check global cache first
    if (
      GLOBAL_PRICE_CACHE.prices[uniqueId] &&
      Date.now() - GLOBAL_PRICE_CACHE.lastUpdated <
        GLOBAL_PRICE_CACHE.CACHE_DURATION
    ) {
      return GLOBAL_PRICE_CACHE.prices[uniqueId];
    }

    // Add a pending request check
    if (GLOBAL_PRICE_CACHE.pendingRequests?.[uniqueId]) {
      return GLOBAL_PRICE_CACHE.pendingRequests[uniqueId];
    }

    const requestPromise = (async () => {
      let lastError;
      let backoffDelay = PriceService.RETRY_DELAY;

      for (let attempt = 1; attempt <= PriceService.MAX_RETRIES; attempt++) {
        try {
          const endpoint = this._buildEndpoint(provider, key);
          const response = await axios.get(endpoint, {
            timeout: PriceService.TIMEOUT,
            validateStatus: (status) => status >= 200 && status < 500,
            maxRedirects: 5,
          });

          if (response.data?.price != null) {
            // Update global cache
            GLOBAL_PRICE_CACHE.prices[uniqueId] = response.data.price;
            GLOBAL_PRICE_CACHE.lastUpdated = Date.now();
            return response.data.price;
          }
          throw new Error("Invalid price data received");
        } catch (error) {
          lastError = error;
          const errorMessage = error.response?.data?.message || error.message;
          console.warn(
            `Attempt ${attempt}/${PriceService.MAX_RETRIES} failed to fetch price for ${token} from ${provider}:`,
            errorMessage,
          );

          if (attempt < PriceService.MAX_RETRIES) {
            const jitter = Math.random() * 1000;
            await new Promise((resolve) =>
              setTimeout(resolve, backoffDelay + jitter),
            );
            backoffDelay *= 2;
          }
        }
      }

      const fallbackPrice = this._getFallbackPrice(token);
      if (fallbackPrice !== null) {
        console.warn(`Using fallback price for ${token}: ${fallbackPrice}`);
        return fallbackPrice;
      }

      console.error(
        `All attempts failed to fetch price for ${token} from ${provider}:`,
        lastError,
      );
      return null;
    })();

    // Store the pending request
    if (!GLOBAL_PRICE_CACHE.pendingRequests) {
      GLOBAL_PRICE_CACHE.pendingRequests = {};
    }
    GLOBAL_PRICE_CACHE.pendingRequests[uniqueId] = requestPromise;

    try {
      const result = await requestPromise;
      delete GLOBAL_PRICE_CACHE.pendingRequests[uniqueId];
      return result;
    } catch (error) {
      delete GLOBAL_PRICE_CACHE.pendingRequests[uniqueId];
      throw error;
    }
  }

  _getFallbackPrice(token) {
    if (token.toLowerCase() in PriceService.STATIC_PRICES) {
      return PriceService.STATIC_PRICES[token.toLowerCase()];
    }
    return null;
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
  static DEFAULT_CONFIG = {
    batchSize: 2,
    requestsPerMinute: 30,
  };

  constructor(priceService, config = {}) {
    this.priceService = priceService;
    this.config = { ...TokenPriceBatcher.DEFAULT_CONFIG, ...config };
    this.requestTimes = [];
    this._startQueueProcessor();
  }

  _startQueueProcessor() {
    // Only start the processor if it's not already running
    if (!GLOBAL_QUEUE.processing) {
      GLOBAL_QUEUE.processing = true;
      this._processQueue();
    }
  }

  async _processQueue() {
    while (true) {
      const queuedTokens = Array.from(GLOBAL_QUEUE.queue.entries())
        .filter(([_, { status }]) => status === "pending")
        .map(([token, _]) => token);

      if (queuedTokens.length > 0) {
        const batch = queuedTokens.slice(0, this.config.batchSize);
        const delayMs = await this._calculateRequiredDelay();

        if (delayMs > 0) {
          await this._delay(delayMs);
        }

        // Process the batch
        try {
          const results = await this._processBatch(batch);
          results.forEach(({ token, price }) => {
            const queueItem = GLOBAL_QUEUE.queue.get(token);
            if (queueItem) {
              queueItem.resolve(price);
              GLOBAL_QUEUE.queue.delete(token);
            }
          });
        } catch (error) {
          batch.forEach((token) => {
            const queueItem = GLOBAL_QUEUE.queue.get(token);
            if (queueItem) {
              queueItem.reject(error);
              GLOBAL_QUEUE.queue.delete(token);
            }
          });
        }
      }

      // Wait before processing next batch
      await this._delay(GLOBAL_QUEUE.QUEUE_PROCESS_INTERVAL);
    }
  }

  async fetchPrices(tokensToFetch) {
    const prices = { ...PriceService.STATIC_PRICES };
    const promises = [];

    for (const [token, priceID] of tokensToFetch) {
      // Check if token is already in static prices
      if (token.toLowerCase() in PriceService.STATIC_PRICES) {
        prices[token] = PriceService.STATIC_PRICES[token.toLowerCase()];
        continue;
      }

      // Add to queue if not already there
      if (!GLOBAL_QUEUE.queue.has(token)) {
        const promise = new Promise((resolve, reject) => {
          GLOBAL_QUEUE.queue.set(token, {
            priceID,
            resolve,
            reject,
            status: "pending",
            timestamp: Date.now(),
          });
        });
        promises.push(
          promise.then((price) => {
            prices[token] = price;
          }),
        );
      } else {
        // If already in queue, wait for existing promise
        const queueItem = GLOBAL_QUEUE.queue.get(token);
        promises.push(
          new Promise((resolve, reject) => {
            queueItem.resolve = resolve;
            queueItem.reject = reject;
          }).then((price) => {
            prices[token] = price;
          }),
        );
      }
    }

    await Promise.all(promises);
    return prices;
  }

  async _processBatch(batch) {
    const pricePromises = batch.map(async (token) => {
      const queueItem = GLOBAL_QUEUE.queue.get(token);
      if (!queueItem) return { token, price: null };

      if (process.env.TEST === "true") {
        return { token, price: 1 };
      }

      const price = await this.priceService.fetchPrice(
        token,
        queueItem.priceID,
      );
      return { token, price };
    });

    return Promise.all(pricePromises);
  }

  _calculateRequiredDelay() {
    const oneMinuteAgo = Date.now() - 60000;
    this.requestTimes = this.requestTimes.filter((time) => time > oneMinuteAgo);

    if (this.requestTimes.length < this.config.requestsPerMinute) {
      return 0; // No delay needed if we haven't hit the rate limit
    }

    // Calculate when we can make the next request
    const oldestRequest = this.requestTimes[0];
    const nextAvailableTime = oldestRequest + 60000; // One minute after oldest request
    const delayNeeded = nextAvailableTime - Date.now();

    return Math.max(0, delayNeeded);
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
export { TokenPriceBatcher, PriceService };
