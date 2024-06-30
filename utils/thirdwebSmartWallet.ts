import { AllWeatherPortfolio } from "../classes/AllWeatherPortfolio";
export async function investByAAWallet(
  portfolioHelper: AllWeatherPortfolio,
  investmentAmount: string,
  chosenToken: string,
) {
  return await portfolioHelper.diversify(investmentAmount, chosenToken);
}

export async function getPortfolioHelper(
  portfolioName: string,
  account: any,
): Promise<AllWeatherPortfolio> {
  let portfolioHelper: AllWeatherPortfolio;
  if (portfolioName === "AllWeatherPortfolio") {
    portfolioHelper = new AllWeatherPortfolio(account);
  } else {
    throw new Error("Invalid portfolio name");
  }
  await portfolioHelper.initialize();
  return portfolioHelper;
}
