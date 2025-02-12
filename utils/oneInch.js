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

export async function fetch1InchSwapData(
  chainId,
  fromTokenAddress,
  toTokenAddress,
  amount,
  fromAddress,
  slippage,
) {
  if (fromAddress.toLowerCase() === toTokenAddress.toLowerCase()) {
    throw new Error("fromTokenAddress and toTokenAddress are the same");
  }
  const url = `${API_URL}/the_best_swap_data?chainId=${chainId}&fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount.toString()}&fromAddress=${fromAddress}&slippage=${slippage}&provider=0x`;
  const retryLimit = 3;
  const retryStatusCodes = [429, 500, 502, 503, 504];

  for (let attempt = 0; attempt < retryLimit; attempt++) {
    try {
      const res = await fetch(url);

      if (!res.ok && !retryStatusCodes.includes(res.status)) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      if (res.ok) {
        return res.json(); // This parses the JSON body for you
      }
    } catch (error) {
      if (attempt === retryLimit - 1) {
        throw error; // Re-throw the error on the last attempt
      }
    }

    // Delay before retrying; you can adjust the delay as needed
    await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 3000));
  }
  throw new Error(`Failed to fetch data after retries, url: ${url}`);
}
