import { Button } from "antd";
import { useState, useEffect, useMemo, useRef } from "react";
import { getTokens } from "../../utils/dustConversion";
import ImageWithFallback from "../../pages/basicComponents/ImageWithFallback";
import { transformToDebankChainName } from "../../utils/chainHelper";
import Image from "next/image";
import { ASSET_CONFIG } from "../../config/assetConfig";
// =============== Types ===============
/**
 * @typedef {Object} Token
 * @property {string} id - Unique identifier
 * @property {string} symbol - Token symbol
 * @property {string} [optimized_symbol] - Optimized token symbol
 * @property {number} amount - Token amount
 * @property {number} price - Token price in USD
 * @property {string} [logo_url] - URL to token logo
 */

/**
 * @typedef {Object} ConversionMessage
 * @property {string} fromToken - Source token symbol
 * @property {string} toToken - Target token symbol
 * @property {number} amount - Amount to convert
 * @property {number} outputAmount - Output amount
 * @property {number} tradingLoss - Trading loss in USD
 * @property {string} dexAggregator - DEX aggregator name
 */

// =============== Utils ===============
/**
 * Formats small numbers with appropriate precision
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
const formatSmallNumber = (num) => {
  const n = Number(num);
  if (isNaN(n)) return "-";
  if (n < 0.000001 && n > 0) return "< 0.000001";
  return Number(n.toFixed(6)).toString();
};

/**
 * Filters and sorts tokens by their total value
 * @param {Token[]} tokens - Array of tokens
 * @returns {Token[]} Filtered and sorted tokens
 */
const getFilteredAndSortedTokens = (tokens) => {
  if (!tokens?.length) return [];
  return tokens
    .filter((token) => token.price > 0)
    .sort((a, b) => b.amount * b.price - a.amount * a.price);
};

// =============== Components ===============
/**
 * Displays a token image with fallback
 * @param {Object} props
 * @param {Token} props.token - Token object
 * @param {number} [props.size=20] - Size of the image in pixels
 * @param {string} [props.className=""] - Additional CSS classes
 */
const TokenImage = ({ token, size = 20, className = "" }) => {
  const symbol = token.optimized_symbol || token.symbol;

  if (token.logo_url) {
    return (
      <img
        src={token.logo_url}
        alt={symbol}
        className={`rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <ImageWithFallback
      token={symbol}
      height={size}
      width={size}
      className={className}
    />
  );
};

/**
 * Displays a single token row with its details
 * @param {Object} props
 * @param {Token} props.token - Token object
 */
const TokenRow = ({ token }) => {
  const totalValue = token.amount * token.price;
  const symbol = token.optimized_symbol || token.symbol;

  return (
    <div className="flex items-center gap-4 p-3 hover:bg-gray-50">
      <TokenImage token={token} size={32} className="w-8 h-8" />
      <div className="flex-1">
        <div className="font-medium text-gray-900">{symbol}</div>
        <div className="text-xs text-gray-500">
          {formatSmallNumber(token.amount)} tokens
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium text-gray-900">
          ${formatSmallNumber(totalValue)}
        </div>
        <div className="text-xs text-gray-500">
          ${formatSmallNumber(token.price)} each
        </div>
      </div>
    </div>
  );
};

/**
 * Service information component
 */
const ServiceInfo = () => (
  <div className="bg-blue-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
    <div className="flex items-center justify-center gap-2 mb-2">
      <svg
        className="w-5 h-5 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="font-medium text-blue-900">Service Information</span>
    </div>
    <div className="text-sm text-blue-800 space-y-1">
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Free dust conversion service</span>
      </div>
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Gas fees sponsored by Zap Pilot</span>
      </div>
    </div>
  </div>
);

/**
 * Summary card component
 * @param {Object} props
 * @param {number} props.totalValue - Total value of all dust tokens
 * @param {number} props.tokenCount - Number of tokens with value
 * @param {boolean} props.isLoading - Whether conversion is in progress
 * @param {string} props.errorMsg - Error message if any
 * @param {Function} props.onConvert - Async callback for convert button click
 */
const DustSummary = ({
  totalValue,
  tokenCount,
  loading,
  converting,
  errorMsg,
  onConvert,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-900 mb-2">
        Total Dust Value: ${formatSmallNumber(totalValue)}
      </div>
      <div className="text-sm text-gray-600 mb-6">
        {tokenCount} tokens with value
      </div>

      <ServiceInfo />

      <Button
        type="primary"
        size="large"
        onClick={async () => {
          try {
            await onConvert();
          } catch (err) {
            console.error("Conversion error:", err);
          }
        }}
        loading={converting || loading}
        disabled={totalValue === 0}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all w-full max-w-md"
      >
        Convert Dust to ETH
      </Button>
      {errorMsg && <div className="mt-2 text-red-500 text-sm">{errorMsg}</div>}
    </div>
  </div>
);

/**
 * Progress bar component
 * @param {Object} props
 * @param {number} props.progress - Progress percentage (0-100)
 */
const ProgressBar = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
    <div
      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
      style={{ width: `${progress}%` }}
    />
  </div>
);

/**
 * Conversion status component
 * @param {Object} props
 * @param {ConversionMessage[]} props.messages - Array of conversion messages
 * @param {Token[]} props.tokens - Array of token objects
 * @param {Object.<string, number>} props.tokenPricesMappingTable - Mapping of token symbols to prices
 * @param {number} props.totalSteps - Total number of conversion steps
 */
const ConversionStatus = ({
  messages,
  tokens,
  tokenPricesMappingTable,
  totalSteps,
}) => {
  if (!messages.length) return null;

  const totalLoss = messages.reduce((sum, msg) => sum + msg.tradingLoss, 0);
  const progress = Math.min(100, (messages.length / totalSteps) * 100);

  const getTokenInfo = (symbol) => {
    return (
      tokens.find(
        (t) =>
          (t.optimized_symbol || t.symbol).toLowerCase() ===
          symbol.toLowerCase(),
      ) || { symbol }
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm mt-4">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium text-gray-700">
            Converting Tokens
          </div>
          <div className="text-sm text-gray-500">
            {messages.length} of {totalSteps} steps
          </div>
        </div>
        <ProgressBar progress={progress} />
      </div>
      <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-gray-700">
        <span>Total Trading Loss:</span>
        <span className="font-bold text-pink-500">
          ${formatSmallNumber(Math.abs(totalLoss))}
        </span>
      </div>
      <div className="divide-y">
        {messages.map((msg, index) => {
          const fromToken = getTokenInfo(msg.fromToken);
          const toToken = getTokenInfo(msg.toToken);
          const outputValue =
            msg.outputAmount *
            tokenPricesMappingTable[toToken.optimized_symbol || toToken.symbol];

          return (
            <div key={index} className="flex items-center gap-4 p-3">
              <Image
                src={ASSET_CONFIG.getAssetPath(
                  `/projectPictures/${msg.dexAggregator}.webp`,
                )}
                alt={msg.dexAggregator}
                height={32}
                width={32}
                className="rounded-full"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <TokenImage token={fromToken} size={24} className="w-6 h-6" />
                  {fromToken.optimized_symbol || fromToken.symbol}
                  <span className="text-xs text-gray-500">
                    {formatSmallNumber(msg.amount)} tokens
                  </span>
                  <span className="text-gray-400">→</span>
                  {formatSmallNumber(msg.outputAmount)}
                  <TokenImage token={toToken} size={24} className="w-6 h-6" />
                  {toToken.optimized_symbol || toToken.symbol}
                  <span className="text-xs text-gray-500">
                    ${formatSmallNumber(outputValue)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Trading Loss:{" "}
                  <span className="text-pink-500">
                    ${formatSmallNumber(Math.abs(msg.tradingLoss))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Token list component
 * @param {Object} props
 * @param {Token[]} props.tokens - Array of token objects
 * @param {boolean} props.showDetails - Whether to show token details
 * @param {Function} props.onToggleDetails - Callback to toggle details visibility
 */
const TokenList = ({ tokens, showDetails, onToggleDetails }) => {
  const filteredAndSortedTokens = useMemo(
    () => getFilteredAndSortedTokens(tokens),
    [tokens],
  );

  if (!filteredAndSortedTokens.length) return null;

  const totalDustValue = filteredAndSortedTokens.reduce(
    (sum, token) => sum + token.amount * token.price,
    0,
  );

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold text-gray-700">
            {filteredAndSortedTokens.length} Tokens Found
          </div>
          <div
            className="text-blue-600 cursor-pointer"
            onClick={onToggleDetails}
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Total Dust Value:{" "}
          <span className="font-semibold text-blue-900">
            ${formatSmallNumber(totalDustValue)}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="divide-y">
          {filteredAndSortedTokens.map((token) => (
            <TokenRow key={token.id} token={token} />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main component for converting dust tokens
 * @param {Object} props
 * @param {Object} props.account - User account information
 * @param {Object} props.chainId - Current chain information
 * @param {Object.<string, number>} props.tokenPricesMappingTable - Mapping of token symbols to prices
 * @param {Function} props.handleAAWalletAction - Handler for wallet actions
 * @param {boolean} props.zapInIsLoading - Whether conversion is in progress
 * @param {string} props.errorMsg - Error message if any
 */
export default function ConvertDustTab({
  account,
  chainId,
  tokenPricesMappingTable,
  handleAAWalletAction,
  errorMsg,
}) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statusMessages, setStatusMessages] = useState([]);
  const [totalSteps, setTotalSteps] = useState(0);

  // Add a ref to track the latest status messages
  const statusMessagesRef = useRef([]);

  // Update ref whenever statusMessages changes
  useEffect(() => {
    statusMessagesRef.current = statusMessages;
  }, [statusMessages]);

  const handleStatusUpdate = (message) => {
    const currentMessages = statusMessagesRef.current;
    const updatedMessages = [...currentMessages, message];

    if (currentMessages.length === 0 && message.totalSteps) {
      setTotalSteps(message.totalSteps);
    }

    setStatusMessages(updatedMessages);
  };

  useEffect(() => {
    if (!account?.address || !chainId?.name) return;

    const fetchTokens = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedTokens = await getTokens(
          transformToDebankChainName(chainId.name.toLowerCase()),
          account.address,
        );
        setTokens(fetchedTokens);
      } catch (err) {
        setError(err.message);
        setTokens([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [account?.address, chainId?.name]);

  const filteredAndSortedTokens = useMemo(
    () => getFilteredAndSortedTokens(tokens),
    [tokens],
  );

  const totalValue = useMemo(
    () =>
      filteredAndSortedTokens.reduce(
        (sum, token) => sum + token.amount * token.price,
        0,
      ),
    [filteredAndSortedTokens],
  );

  const handleConvert = async () => {
    console.log("in handleConvert");
    setIsConverting(true);
    setStatusMessages([]);
    setTotalSteps(filteredAndSortedTokens.length);
    try {
      await handleAAWalletAction("convertDust", true, handleStatusUpdate);
    } catch (err) {
      console.error("Conversion error:", err);
    } finally {
      console.log("finally");
      setIsConverting(false);
    }
    console.log("after finally");
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <DustSummary
          totalValue={totalValue}
          tokenCount={filteredAndSortedTokens.length}
          errorMsg={errorMsg}
          onConvert={handleConvert}
          loading={loading}
          converting={isConverting}
        />
        {isConverting && (
          <ConversionStatus
            messages={statusMessages}
            tokens={tokens}
            tokenPricesMappingTable={tokenPricesMappingTable}
            totalSteps={totalSteps}
          />
        )}
      </div>

      {loading ? (
        <div className="text-center py-4">Loading tokens...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">{error}</div>
      ) : !filteredAndSortedTokens.length ? (
        <div className="text-center py-4 text-gray-500">
          No dust tokens with value found
        </div>
      ) : (
        <TokenList
          tokens={tokens}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails(!showDetails)}
        />
      )}
    </div>
  );
}
