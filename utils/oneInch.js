const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SDK_API_URL = process.env.NEXT_PUBLIC_SDK_API_URL;

// when testing on local, place the localhost porfolio address here
// for contract write, you need to connect to local node
// export const portfolioContractAddress =
//   "0x36bb138Eb364889317Fd324a8f4A1d4CB244A198";
// for contract read
export const portfolioContractAddress =
  // "0xEDBDbd03784C8dBA343A23877799d113E2F257Af";
  "0x95503FfAffD9E8B2aEa782F36bb5C8B85a4e41D4";
export const magicVaultAddress = "0xA3CDd5a4b9f5a69C5C3a297A428A10B742F1c6E1";
// "0xC6a58A8494E61fc4EF04F6075c4541C9664ADcC9";
export const equilibriaGLPVaultAddress =
  // "0x271E3409093f7ECffFB2a1C82e5E87B2ecB3E310";
  "0xBb4D0819089879d83ae13fEe71aBeAa345629389";
export const equilibriaGDAIVaultAddress =
  // "0x549caec2C863a04853Fb829aac4190E1B50df0Cc";
  "0x0F658FC0C72A729F1B8F8444601D657D3F30Db41";
export const equilibriaRETHVaultAddress =
  // "0xE66c4EA218Cdb8DCbCf3f605ed1aC29461CBa4b8";
  "0x5073bf9aE65963A5881F36560072adf5d4c6e870";
export const equilibriaPendleVaultAddress =
  "0x4999AE9fDD361Ca6278B0295dd65776b4587E1aA";
export const radiantDlpAddress = "0x99E9cE14C807e95329a2A35aDD52683528e53231";

export const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export const magicTokenAddress = "0x539bdE0d7Dbd336b79148AA742883198BBF60342";
export const gDAIMarketPoolAddress =
  "0xa0192f6567f8f5DC38C53323235FD08b318D2dcA";
export const daiAddress = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
export const glpMarketPoolAddress =
  "0x7D49E5Adc0EAAD9C027857767638613253eF125f";
export const rethMarketPoolAddress =
  "0x14FbC760eFaF36781cB0eb3Cb255aD976117B9Bd";
export const pendleMarketPoolAddress =
  "0x24e4Df37ea00C4954d668e3ce19fFdcffDEc2cF6";
export const rethTokenAddress = "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8";
export async function fetch1InchSwapData(
  chainId,
  fromTokenAddress,
  toTokenAddress,
  amount,
  fromAddress,
  slippage,
) {
  const url = `${API_URL}/one_1inch_swap_data?chainId=${chainId}&fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount.toString()}&fromAddress=${fromAddress}&slippage=${slippage}`;
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
  throw new Error("Failed to fetch data after retries");
}

export async function getPendleZapInData(
  chainId,
  poolAddress,
  amount,
  slippage,
  tokenInAddress,
) {
  const url = `${SDK_API_URL}/pendle/zapIn?chainId=${chainId}&poolAddress=${poolAddress}&amount=${amount.toString()}&slippage=${slippage}&tokenInAddress=${tokenInAddress}`;
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
  throw new Error("Failed to fetch data after retries");
}
