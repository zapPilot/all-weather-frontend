const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const portfolioContractAddress =
  "0xD188492217F09D18f2B0ecE3F8948015981e961a";
export const apolloxVaultAddress = "0x9Ad45D46e2A2ca19BBB5D5a50Df319225aD60e0d";
// "0xC6a58A8494E61fc4EF04F6075c4541C9664ADcC9";
// export const equilibriaGLPVaultAddress =
//   // "0x271E3409093f7ECffFB2a1C82e5E87B2ecB3E310";
//   "0xBb4D0819089879d83ae13fEe71aBeAa345629389";
// export const equilibriaGDAIVaultAddress =
//   // "0x549caec2C863a04853Fb829aac4190E1B50df0Cc";
//   "0x0F658FC0C72A729F1B8F8444601D657D3F30Db41";
// export const equilibriaRETHVaultAddress =
//   // "0xE66c4EA218Cdb8DCbCf3f605ed1aC29461CBa4b8";
//   "0x5073bf9aE65963A5881F36560072adf5d4c6e870";
// export const equilibriaPendleVaultAddress =
//   "0x4999AE9fDD361Ca6278B0295dd65776b4587E1aA";
// export const radiantDlpAddress = "0x99E9cE14C807e95329a2A35aDD52683528e53231";
export const portfolioVaults = [apolloxVaultAddress];

export const ALP = "0x4e47057f45adf24ba41375a175da0357cb3480e5";
export const ApolloX = "0x1b6f2d3844c6ae7d56ceb3c3643b9060ba28feb0";
export const USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
export const APX = "0x78f5d389f5cdccfc41594abab4b0ed02f31398b3";
export const USDT = "0x55d398326f99059ff775485246999027b3197955";
export const oneInchAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";

export async function fetchSwapData(
  chainId,
  fromTokenAddress,
  fromTokenDecimals,
  toTokenAddress,
  toTokenDecimals,
  amount,
  fromAddress,
  slippage,
  provider,
) {
  if (!fromAddress || !toTokenAddress) {
    console.error("Invalid addresses:", { fromAddress, toTokenAddress });
    throw new Error("fromAddress or toTokenAddress is undefined");
  }
  if (fromAddress.toLowerCase() === toTokenAddress.toLowerCase()) {
    throw new Error("fromTokenAddress and toTokenAddress are the same");
  }

  const retryLimit = 3;
  const retryStatusCodes = [429, 500, 502, 503, 504];
  let currentProvider = provider;

  for (let attempt = 0; attempt < retryLimit; attempt++) {
    const url = new URL(`${API_URL}/the_best_swap_data`);
    url.searchParams.set("chainId", chainId);
    url.searchParams.set("fromTokenAddress", fromTokenAddress);
    url.searchParams.set("toTokenAddress", toTokenAddress);
    url.searchParams.set("amount", amount.toString());
    url.searchParams.set("fromAddress", fromAddress);
    url.searchParams.set("slippage", slippage);
    url.searchParams.set("provider", currentProvider);
    url.searchParams.set("fromTokenDecimals", fromTokenDecimals);
    url.searchParams.set("toTokenDecimals", toTokenDecimals);

    try {
      const res = await fetch(url);

      // Handle non-2xx responses
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})); // Safely parse JSON
        console.error("Error response:", errorData);

        // Check for empty or invalid error data
        if (
          currentProvider === "paraswap" &&
          (Object.keys(errorData).length === 0 || res.status >= 400)
        ) {
          console.log(
            `Paraswap failed with empty/invalid response or status ${res.status}. Switching to 1inch.`,
          );
          currentProvider = "1inch";
          attempt = -1;
          continue;
        }

        if (!retryStatusCodes.includes(res.status)) {
          throw new Error(
            `HTTP error! status: ${res.status}, error: ${
              errorData.error || "Unknown error"
            }`,
          );
        }
      }

      // Success case
      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.error(
        `Error on attempt ${attempt + 1} with provider ${currentProvider}:`,
        error.message,
      );

      if (attempt === retryLimit - 1 && currentProvider === "paraswap") {
        console.log("Exhausted retries for Paraswap. Switching to 1inch.");
        currentProvider = "1inch"; // Switch to 1inch
        attempt = -1; // Reset attempts for the new provider
        data = undefined;
        continue; // Retry with updated provider
      }

      if (attempt === retryLimit - 1) {
        throw new Error(
          `Failed to fetch data after retries. Last error: ${error.message}`,
        );
      }
    }

    // Delay before retrying
    await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 3000));
  }

  throw new Error(`Failed to fetch data after retries for all providers.`);
}
