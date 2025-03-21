import axios from "axios";

/**
 * Maps error messages to user-friendly descriptions
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export const mapErrorToUserFriendlyMessage = (error) => {
  const errorMsg = error.message || error.toString();

  // User rejected transaction
  if (errorMsg.includes("User rejected the request")) {
    return "Transaction cancelled by user";
  }

  // Error code mapping
  if (errorMsg.includes("0x495d907f")) {
    return "Bridgequote expired, please try again";
  } else if (errorMsg.includes("0x203d82d8")) {
    return "DeFi pool quote has expired. Please try again.";
  } else if (errorMsg.includes("0x6f6dd725")) {
    return "Swap quote has expired. Please try again.";
  } else if (errorMsg.includes("0xf4059071")) {
    return "Please increase slippage tolerance";
  } else if (errorMsg.includes("0x8f66ec14")) {
    return "The zap in amount is too small, or slippage is too low";
  } else if (
    errorMsg.includes("0x08c379a0") &&
    errorMsg.includes(
      "4552433732313a206f70657261746f7220717565727920666f72206e6f6e6578697374656e7420746f6b656e",
    )
  ) {
    return "ERC721: operator query for nonexistent token";
  } else if (
    errorMsg.includes(
      "2845524332303a207472616e7366657220616d6f756e74206578636565647320616c6c6f77616e6365",
    )
  ) {
    return "ERC20: transfer amount exceeds allowance";
  } else if (
    errorMsg.includes(
      "45524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e6365",
    )
  ) {
    return "ERC20: transfer amount exceeds balance";
  } else if (
    errorMsg.includes(
      "526563656976656420616d6f756e74206f6620746f6b656e7320617265206c657373207468656e206578706563746564",
    ) ||
    (errorMsg.includes("0x08c379a0") &&
      errorMsg.includes(
        "14c00000000000000000000000000000000000000000000000000000000000000",
      ))
  ) {
    return "Received amount of tokens are less than expected, please increase slippage tolerance and try again";
  } else if (errorMsg.includes("0x09bde339")) {
    return "Failed to claim rewards, please try again";
  } else if (errorMsg.endsWith("0x")) {
    return "You sent the transaction to the wrong address";
  } else if (errorMsg.includes("from should be same as current address")) {
    return "You're sending the transaction from the wrong address";
  } else if (errorMsg === "No transactions to send") {
    return "No transactions to send. Please try again with different parameters.";
  }

  // Default error message
  return `${errorMsg}: Please try increasing slippage tolerance or contact our support team for assistance.`;
};

/**
 * Logs transaction errors to Discord webhook if not on localhost
 * @param {Error} error - The error object
 */
export const logErrorToDiscord = (error) => {
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (!isLocalhost) {
    axios.post(`${process.env.NEXT_PUBLIC_SDK_API_URL}/discord/webhook`, {
      errorMsg: `<@&1172000757764075580> ${error.message || error.toString()}`,
    });
  }
};

/**
 * Handles transaction errors with user notification and logging
 * @param {Error} error - The error object
 * @param {Function} notificationAPI - The notification API
 * @param {Object} options - Additional options
 * @param {Function} options.onComplete - Callback to run after error handling
 * @returns {boolean} True if error was handled, false otherwise
 */
export const handleTransactionError = (
  error,
  notificationAPI,
  options = {},
) => {
  // User cancelled, no need for error notification
  if (error?.message?.includes("User rejected the request")) {
    if (options.onComplete) options.onComplete();
    return true;
  }

  const errorReadableMsg = mapErrorToUserFriendlyMessage(error);

  // Show error notification
  if (notificationAPI) {
    notificationAPI.error({
      message: "Transaction Error",
      description: errorReadableMsg,
    });
  } else {
    console.error("Transaction Error:", errorReadableMsg);
  }

  // Log to Discord webhook
  logErrorToDiscord(error);

  // Run completion callback if provided
  if (options.onComplete) options.onComplete();

  return true;
};
