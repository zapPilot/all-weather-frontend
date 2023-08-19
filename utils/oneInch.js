const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const portfolioContractAddress =
  "0x3378b974E111B6A27Df5CF8b96AD646b1860EcD0";
export const dpxVaultAddress = "0x3378b974E111B6A27Df5CF8b96AD646b1860EcD0";
export const equilibriaGDAIVaultAddress =
  "0x3378b974E111B6A27Df5CF8b96AD646b1860EcD0";
export const equilibriaRETHVaultAddress =
  "0x3378b974E111B6A27Df5CF8b96AD646b1860EcD0";

export const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export const dpxTokenAddress = "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55";
export const dpxVault = "0x3378b974E111B6A27Df5CF8b96AD646b1860EcD0"; // replace it once deployed
export const equilibriaGDAIVault = "0x3378b974E111B6A27Df5CF8b96AD646b1860EcD0"; // replace it once deployed
export const equilibriaRETHVault = "0x3378b974E111B6A27Df5CF8b96AD646b1860EcD0"; // replace it once deployed
export const gDAIMarketPoolAddress =
  "0xa0192f6567f8f5DC38C53323235FD08b318D2dcA";
export const daiAddress = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
export const glpMarketPoolAddress =
  "0x7D49E5Adc0EAAD9C027857767638613253eF125f";
export const rethMarketPoolAddress =
  "0x14FbC760eFaF36781cB0eb3Cb255aD976117B9Bd";
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
  tokenInAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
) {
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = Router.getRouterWithKyberAggregator({
    chainId: chainId,
    provider,
    signer,
  });

  const GLP_POOL_ADDRESS = toAddress(poolAddress);
  const TOKEN_IN_ADDRESS = toAddress(tokenInAddress);
  return await router.addLiquiditySingleToken(
    GLP_POOL_ADDRESS,
    TOKEN_IN_ADDRESS,
    amount,
    slippage,
    { method: "extractParams" },
  );
}
export async function getPendleZapOutData(
  chainId,
  poolAddress,
  tokenOutAddress,
  amount,
  slippage,
) {
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const marketContract = new MarketEntity(toAddress(poolAddress), {
    chainId: chainId,
    provider,
    signer: signer,
  });
  const router = Router.getRouterWithKyberAggregator({
    chainId: chainId,
    provider,
    signer,
  });
  // TODO(david): ask pendle team about this. Is it possible to extract Param before approving contract?
  // await marketContract.approve(router.address, amount).then((tx)=> tx.wait());
  // await marketContract.approve(router.address, ethers.BigNumber.from('115792089237316195423570985008687907853269984665640564039457')).then((tx) => tx.wait());

  return await router.removeLiquiditySingleToken(
    toAddress(poolAddress),
    amount,
    toAddress(tokenOutAddress),
    slippage,
    { method: "extractParams" },
  );
}
