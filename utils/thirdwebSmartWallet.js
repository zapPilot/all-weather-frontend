import { AllWeatherPortfolio } from "../classes/AllWeatherPortfolio";

export async function investByAAWallet(investmentAmount, chosenToken, account) {
  const portfolioHelper = await getPortfolioHelper(
    "AllWeatherPortfolio",
    account,
  );
  return await portfolioHelper.diversify(investmentAmount, chosenToken);
}

async function getPortfolioHelper(portfolioName, account) {
  let portfolioHelper;
  if (portfolioName === "AllWeatherPortfolio") {
    portfolioHelper = new AllWeatherPortfolio(account);
  }
  await portfolioHelper.initialize();
  return portfolioHelper;
}
