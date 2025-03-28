import axios from "axios";
import { isLocalEnvironment } from "./environment";

const ERROR_MESSAGES = {
  REJECTED_TRANSACTION: "Transaction was rejected by the user",
  INSUFFICIENT_FUNDS: "Insufficient funds for transaction",
  SLIPPAGE_TOO_HIGH: "Price impact too high, try reducing the amount",
  NETWORK_ERROR: "Network error occurred. Please try again",
  DEFAULT: "An error occurred. Please try again",
};

/**
 * Maps blockchain errors to user-friendly messages
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
const mapErrorToUserFriendlyMessage = (error) => {
  const errorMessage = error.message?.toLowerCase() || "";

  if (
    errorMessage.includes("user rejected") ||
    errorMessage.includes("user denied")
  ) {
    return ERROR_MESSAGES.REJECTED_TRANSACTION;
  }

  if (errorMessage.includes("insufficient funds")) {
    return ERROR_MESSAGES.INSUFFICIENT_FUNDS;
  }

  if (
    errorMessage.includes("slippage") ||
    errorMessage.includes("price impact")
  ) {
    return ERROR_MESSAGES.SLIPPAGE_TOO_HIGH;
  }

  if (
    errorMessage.includes("network error") ||
    errorMessage.includes("network request failed")
  ) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  return ERROR_MESSAGES.DEFAULT;
};

/**
 * Logs transaction errors to Discord webhook if not in local environment
 * @param {Error} error - The error object
 */
const logErrorToDiscord = async (error) => {
  if (isLocalEnvironment) return;

  try {
    await axios.post(`${process.env.NEXT_PUBLIC_SDK_API_URL}/discord/webhook`, {
      errorMsg: `<@&1172000757764075580> ${error.message || error.toString()}`,
    });
  } catch (webhookError) {
    console.error("Failed to log error to Discord:", webhookError);
  }
};

/**
 * Main error handler for transactions
 * @param {Error} error - The error object
 * @param {Function} notificationAPI - Notification function to display messages
 * @returns {string} User-friendly error message
 */
export const handleTransactionError = async (error, notificationAPI) => {
  const userMessage = mapErrorToUserFriendlyMessage(error);

  // Log error to Discord in production
  await logErrorToDiscord(error);

  // Show error notification if notification API is provided
  if (notificationAPI) {
    notificationAPI.error({
      message: "Transaction Failed",
      description: userMessage,
    });
  }

  return userMessage;
};

/**
 * Format blockchain error messages for display
 * @param {string} message - Raw error message
 * @returns {string} Formatted error message
 */
export const formatErrorMessage = (message) => {
  if (!message) return ERROR_MESSAGES.DEFAULT;

  // Remove technical details and blockchain-specific prefixes
  return message
    .replace(/\{.*?\}/g, "") // Remove JSON-like content
    .replace(/\[.*?\]/g, "") // Remove bracketed content
    .replace(/^Error:?\s*/i, "") // Remove 'Error:' prefix
    .trim();
};

export { mapErrorToUserFriendlyMessage };
