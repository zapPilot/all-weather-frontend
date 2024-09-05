import { AllWeatherPortfolio } from "../classes/AllWeatherPortfolio";
import { StablecoinVault } from "../classes/Vaults/StablecoinVault";
import { EthVault } from "../classes/Vaults/EthVault";
import { BasePortfolio } from "../classes/BasePortfolio";
export function getPortfolioHelper(
  portfolioName: string,
): AllWeatherPortfolio | BasePortfolio | undefined {
  let portfolioHelper: AllWeatherPortfolio | BasePortfolio;
  if (portfolioName === "AllWeatherPortfolio") {
    portfolioHelper = new AllWeatherPortfolio();
  } else if (portfolioName === "Stablecoin Vault") {
    portfolioHelper = new StablecoinVault();
  } else if (portfolioName === "ETH Vault") {
    portfolioHelper = new EthVault();
  } else {
    return;
  }
  return portfolioHelper;
}
