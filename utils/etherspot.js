import { AllWeatherPortfolio } from "../classes/AllWeatherPortfolio";

export async function investByAAWallet(investmentAmount, chosenToken) {
  console.log("Investing by AA Wallet...");
  console.log("chosenToken", chosenToken);
  const portfolioHelper = await getPortfolioHelper("AllWeatherPortfolio");
  const transactionHash = await portfolioHelper.diversify(
    investmentAmount,
    chosenToken,
  );
  console.log("transactionHash", transactionHash);
  // const dataService = new DataUtils(
  //     "public-prime-testnet-key",
  //     graphqlEndpoints.QA,
  // );
  // const balances = await dataService.getAccountBalances({
  //     account: aaWalletAddress,
  //     chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
  // });
  // console.log("\x1b[33m%s\x1b[0m", `EtherspotWallet balances:`, balances);
}

async function getPortfolioHelper(portfolioName) {
  let portfolioHelper;
  if (portfolioName === "AllWeatherPortfolio") {
    portfolioHelper = new AllWeatherPortfolio();
  }
  await portfolioHelper.initialize();
  return portfolioHelper;
}
