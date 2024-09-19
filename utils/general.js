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
