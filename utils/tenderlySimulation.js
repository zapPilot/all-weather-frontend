/**
 * Tenderly Simulation Utility
 * Simulates transaction arrays using Tenderly's Simulation API
 */

import axios from "axios";
import logger from "./logger";

const TENDERLY_CONFIG = {
  baseURL: "https://api.tenderly.co/api/v1",
  account: process.env.NEXT_PUBLIC_TENDERLY_ACCOUNT || "your-account",
  project: process.env.NEXT_PUBLIC_TENDERLY_PROJECT || "your-project",
  accessKey: process.env.NEXT_PUBLIC_TENDERLY_ACCESS_KEY || "",
};

/**
 * Create a Tenderly simulation for transaction array
 * @param {Array} transactions - Flattened transaction array from txns.flat(Infinity)
 * @param {Object} context - Additional context (chainId, account, etc.)
 * @returns {Promise<Object>} Simulation result with Tenderly URL
 */
export async function simulateTransactionBundle(transactions, context = {}) {
  if (!TENDERLY_CONFIG.accessKey) {
    throw new Error("Tenderly access key not configured");
  }

  try {
    const { chainId, accountAddress, portfolioName } = context;

    // Convert chain ID to network identifier
    const networkId = getNetworkIdFromChainId(chainId?.id);

    // Prepare simulation request
    const simulationRequest = {
      // Use bundle simulation for multiple transactions
      network_id: networkId,
      from: accountAddress,
      // Convert transactions to Tenderly format
      transactions: transactions.map((tx, index) => ({
        to: tx.to,
        data: tx.data || "0x",
        value: tx.value || "0x0",
        gas: tx.gas || "0x1e8480", // 2M gas default
        gas_price: "0x9184e72a000", // 10 gwei
        transaction_index: index,
      })),
      // Simulate as atomic bundle
      bundle: true,
      // Save simulation for sharing
      save: true,
      // Add metadata
      description: `${portfolioName} - ${transactions.length} transactions`,
      // Include state overrides if needed
      state_overrides: {},
    };

    logger.log("🔄 Creating Tenderly simulation...", {
      transactionCount: transactions.length,
      networkId,
      portfolioName,
    });

    const response = await axios.post(
      `${TENDERLY_CONFIG.baseURL}/account/${TENDERLY_CONFIG.account}/project/${TENDERLY_CONFIG.project}/simulate-bundle`,
      simulationRequest,
      {
        headers: {
          "X-Access-Key": TENDERLY_CONFIG.accessKey,
          "Content-Type": "application/json",
        },
      },
    );

    const simulation = response.data.simulation;

    // Generate Tenderly UI URL
    const tenderlyUrl = `https://dashboard.tenderly.co/${TENDERLY_CONFIG.account}/${TENDERLY_CONFIG.project}/simulator/${simulation.id}`;

    logger.log("✅ Tenderly simulation created:", {
      simulationId: simulation.id,
      status: simulation.status,
      url: tenderlyUrl,
    });

    return {
      success: true,
      simulationId: simulation.id,
      status: simulation.status,
      gasUsed: simulation.gas_used,
      transactionResults: simulation.transaction_results || [],
      url: tenderlyUrl,
      shareUrl: `${tenderlyUrl}?share=true`,
      // Enhanced results for UI display
      summary: {
        totalTransactions: transactions.length,
        successfulTransactions:
          simulation.transaction_results?.filter((t) => t.status).length || 0,
        totalGasUsed: simulation.gas_used,
        estimatedCost: calculateEstimatedCost(simulation.gas_used, networkId),
        duration: simulation.duration || 0,
      },
      // Transaction breakdown
      transactionBreakdown:
        simulation.transaction_results?.map((result, index) => ({
          index,
          to: transactions[index]?.to,
          function: extractFunctionName(transactions[index]?.data),
          status: result.status ? "Success" : "Failed",
          gasUsed: result.gas_used,
          error: result.error_message,
        })) || [],
    };
  } catch (error) {
    logger.error("❌ Tenderly simulation failed:", error);

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      // Fallback to manual analysis
      analysis: analyzeTransactionsLocally(transactions, context),
    };
  }
}

/**
 * Get network ID for Tenderly from chain ID
 */
function getNetworkIdFromChainId(chainId) {
  const networkMap = {
    1: "1", // Ethereum Mainnet
    8453: "8453", // Base
    42161: "42161", // Arbitrum One
    10: "10", // Optimism
    137: "137", // Polygon
  };

  return networkMap[chainId] || "1";
}

/**
 * Extract function name from transaction data
 */
function extractFunctionName(data) {
  if (!data || data === "0x") return "Transfer";

  const functionSignatures = {
    "0x095ea7b3": "approve",
    "0xa9059cbb": "transfer",
    "0x23b872dd": "transferFrom",
    "0x7cbc2373": "redeem",
    "0xbb43878e": "harvest",
    "0x1249c58b": "mint",
    "0x69328dec": "deposit",
    "0x2e1a7d4d": "withdraw",
    "0x3ccfd60b": "withdraw",
    "0x441a3e70": "stake",
    "0x2e17de78": "unstake",
  };

  const signature = data.slice(0, 10);
  return functionSignatures[signature] || `0x${signature.slice(2)}`;
}

/**
 * Calculate estimated cost in USD
 */
function calculateEstimatedCost(gasUsed, networkId) {
  // Simplified cost calculation - in production, use live gas prices
  const gasPrices = {
    1: 20, // 20 gwei for Ethereum
    8453: 0.01, // 0.01 gwei for Base
    42161: 0.1, // 0.1 gwei for Arbitrum
    10: 0.001, // 0.001 gwei for Optimism
  };

  const gasPrice = gasPrices[networkId] || 20;
  const ethPrice = 3000; // Simplified - should fetch live price

  return ((gasUsed * gasPrice * ethPrice) / 10 ** 18).toFixed(4);
}

/**
 * Local transaction analysis when Tenderly is unavailable
 */
function analyzeTransactionsLocally(transactions, context) {
  return {
    totalTransactions: transactions.length,
    transactionTypes: transactions.reduce((acc, tx) => {
      const func = extractFunctionName(tx.data);
      acc[func] = (acc[func] || 0) + 1;
      return acc;
    }, {}),
    estimatedGas: transactions.length * 150000, // Rough estimate
    note: "Local analysis - use Tenderly for accurate simulation",
  };
}

/**
 * Create a shareable Tenderly fork for testing
 */
export async function createTenderlyFork(networkId, blockNumber = "latest") {
  try {
    const response = await axios.post(
      `${TENDERLY_CONFIG.baseURL}/account/${TENDERLY_CONFIG.account}/project/${TENDERLY_CONFIG.project}/fork`,
      {
        network_id: networkId,
        block_number: blockNumber,
        chain_config: {
          chain_id: parseInt(networkId),
        },
      },
      {
        headers: {
          "X-Access-Key": TENDERLY_CONFIG.accessKey,
          "Content-Type": "application/json",
        },
      },
    );

    const fork = response.data.root_transaction.fork_id;
    const forkUrl = `https://dashboard.tenderly.co/${TENDERLY_CONFIG.account}/${TENDERLY_CONFIG.project}/fork/${fork}`;

    return {
      success: true,
      forkId: fork,
      url: forkUrl,
      rpcUrl: `https://rpc.tenderly.co/fork/${fork}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
