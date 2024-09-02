import { ethers } from "ethers";
import { arbitrum } from "thirdweb/chains";
import { ERC20_ABI } from "../node_modules/@etherspot/prime-sdk/dist/sdk/helpers/abi/ERC20_ABI.js";
import permanentPortfolioJson from "../lib/contracts/PermanentPortfolioLPToken.json" assert { type: "json" };
import { prepareContractCall, getContract } from "thirdweb";
import THIRDWEB_CLIENT from "../utils/thirdweb";

export const PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_RPC_PROVIDER_URL,
);
const APPROVAL_BUFFER = 1.1;
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export function timeAgo(dateString) {
  if (!dateString || dateString?.split(" ") === undefined) return "";
  // Parse the input date string
  const [datePart, timePart] = dateString.split(" ");
  const [month, day, year] = datePart.split("/");
  let [hours, minutes, seconds] = timePart.split(":");
  const date = new Date(year, month - 1, day, hours, minutes, seconds);

  // Get the current time
  const now = new Date();

  // Calculate the difference in milliseconds
  const diffInMs = now - date;

  // Convert milliseconds to various time units
  seconds = Math.floor(diffInMs / 1000);
  minutes = Math.floor(seconds / 60);
  hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  // Create a readable string
  let timeAgoString = "";

  if (years > 0) {
    timeAgoString = `${years} year${years > 1 ? "s" : ""}`;
  } else if (months > 0) {
    timeAgoString = `${months} month${months > 1 ? "s" : ""}`;
  } else if (weeks > 0) {
    timeAgoString = `${weeks} week${weeks > 1 ? "s" : ""}`;
  } else if (days > 0) {
    timeAgoString = `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    timeAgoString = `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    timeAgoString = `${minutes} minute${minutes > 1 ? "s" : ""}`;
  } else {
    timeAgoString = `${seconds} second${seconds > 1 ? "s" : ""}`;
  }
  // Return the string with the timing part bold
  return timeAgoString;
}

export async function getTokenDecimal(tokenAddress) {
  const tokenInstance = new ethers.Contract(tokenAddress, ERC20_ABI, PROVIDER);
  return (await tokenInstance.functions.decimals())[0];
}

export function approve(tokenAddress, spenderAddress, amount, updateProgress) {
  updateProgress("approve");
  const approvalAmount = Math.ceil(amount * APPROVAL_BUFFER);
  if (approvalAmount === 0) {
    throw new Error("Approval amount is 0. Cannot proceed with approving.");
  }
  if (spenderAddress === NULL_ADDRESS) {
    throw new Error("Spender address is null. Cannot proceed with approving.");
  }
  return prepareContractCall({
    contract: getContract({
      client: THIRDWEB_CLIENT,
      address: tokenAddress,
      chain: arbitrum,
      abi: permanentPortfolioJson.abi,
    }),
    method: "approve", // <- this gets inferred from the contract
    params: [spenderAddress, approvalAmount],
  });
}

export async function getLocalizedCurrencyAndExchangeRate() {
  const currency = await fetchCurrency();
  const exchangeRateWithUSD = await getexchangeRateWithUSD(currency);
  return {
    currency,
    exchangeRateWithUSD,
  };
}
export const formatBalanceWithLocalizedCurrency = (
  exchangeRateWithUSD,
  usdDenominatedValue,
  currency,
) => {
  if (isNaN(exchangeRateWithUSD * usdDenominatedValue)) {
    return [currency, 0];
  }
  return exchangeRateWithUSD * usdDenominatedValue < 0.01
    ? [currency, exchangeRateWithUSD * usdDenominatedValue]
    : [currency, (exchangeRateWithUSD * usdDenominatedValue).toFixed(2)];
};

async function getexchangeRateWithUSD(currency) {
  try {
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.rates[currency];
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return 0;
  }
}

const fetchCurrency = async () => {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    return data.currency;
  } catch (error) {
    return "USD";
  }
};
