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
  if (!dateString || typeof dateString !== "string") {
    console.error("Invalid date string provided:", dateString);
    return "Invalid date";
  }

  // Parse the input date string
  const [datePart, timePart] = dateString.split(" ");
  if (!datePart || !timePart) {
    console.error("Date string in unexpected format:", dateString);
    return "Invalid date format";
  }

  const [day, month, year] = datePart.split("/").map(Number);
  const [hours, minutes, seconds] = timePart.split(":").map(Number);

  if (
    isNaN(day) ||
    isNaN(month) ||
    isNaN(year) ||
    isNaN(hours) ||
    isNaN(minutes) ||
    isNaN(seconds)
  ) {
    console.error("Date parts are not valid numbers:", {
      day,
      month,
      year,
      hours,
      minutes,
      seconds,
    });
    return "Invalid date components";
  }

  // Note: month is 0-indexed in JavaScript Date
  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  if (isNaN(date.getTime())) {
    console.error("Invalid date created:", date);
    return "Invalid date";
  }

  // Get the current time
  const now = new Date();

  // Calculate the difference in milliseconds
  const diffInMs = now - date;

  if (diffInMs < 0) {
    console.error("Date is in the future:", dateString, "Current date:", now);
    return "Future date";
  }

  // Convert milliseconds to various time units
  const secondsDiff = Math.floor(diffInMs / 1000);
  const minutesDiff = Math.floor(secondsDiff / 60);
  const hoursDiff = Math.floor(minutesDiff / 60);
  const daysDiff = Math.floor(hoursDiff / 24);
  const weeksDiff = Math.floor(daysDiff / 7);
  const monthsDiff = Math.floor(daysDiff / 30);
  const yearsDiff = Math.floor(daysDiff / 365);

  // Create a readable string
  if (yearsDiff > 0) return `${yearsDiff} year${yearsDiff > 1 ? "s" : ""} ago`;
  if (monthsDiff > 0)
    return `${monthsDiff} month${monthsDiff > 1 ? "s" : ""} ago`;
  if (weeksDiff > 0) return `${weeksDiff} week${weeksDiff > 1 ? "s" : ""} ago`;
  if (daysDiff > 0) return `${daysDiff} day${daysDiff > 1 ? "s" : ""} ago`;
  if (hoursDiff > 0) return `${hoursDiff} hour${hoursDiff > 1 ? "s" : ""} ago`;
  if (minutesDiff > 0)
    return `${minutesDiff} minute${minutesDiff > 1 ? "s" : ""} ago`;
  return `${secondsDiff} second${secondsDiff > 1 ? "s" : ""} ago`;
}
export async function getTokenDecimal(tokenAddress) {
  const tokenInstance = new ethers.Contract(tokenAddress, ERC20_ABI, PROVIDER);
  return (await tokenInstance.functions.decimals())[0];
}

export function approve(tokenAddress, spenderAddress, amount, updateProgress) {
  updateProgress(`approve spending amount to ${spenderAddress}`);
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

export function toFixedString(number, decimals) {
  // Ensure number is a string and decimals is a non-negative integer
  const numberStr = String(number);
  decimals = Math.max(0, Math.floor(decimals));

  // Split the number into integer and fractional parts
  let [integerPart, fractionalPart = ""] = numberStr.split(".");

  // Handle negative numbers
  const isNegative = integerPart[0] === "-";
  if (isNegative) {
    integerPart = integerPart.slice(1);
  }

  // Pad or truncate fractional part
  if (fractionalPart.length < decimals) {
    fractionalPart = fractionalPart.padEnd(decimals, "0");
  } else if (fractionalPart.length > decimals) {
    // Round the fractional part
    const rounded = Math.round(
      Number(`0.${fractionalPart}`) * Math.pow(10, decimals),
    );
    fractionalPart = String(rounded).padStart(decimals, "0");

    // Handle carrying over to integer part
    if (fractionalPart.length > decimals) {
      integerPart = String(BigInt(integerPart) + 1n);
      fractionalPart = fractionalPart.slice(1);
    }
  }

  // Combine parts
  let result = integerPart;
  if (decimals > 0) {
    result += "." + fractionalPart;
  }

  // Add negative sign if necessary
  return isNegative ? "-" + result : result;
}

export function unixToCustomFormat(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000); // Convert to milliseconds
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export const formatBalance = (balance) => {
  return balance > 0.01 ? balance.toFixed(2) : balance;
};
