import { AllWeatherPortfolio } from "../classes/AllWeatherPortfolio";
import { StablecoinVault } from "../classes/Vaults/StablecoinVault";
import { EthVault } from "../classes/Vaults/EthVault";
import { YearnVault } from "../classes/Vaults/Tests/YearnVault";
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
  } else if (portfolioName === "Yearn Vault") {
    portfolioHelper = new YearnVault();
  } else {
    return;
  }
  return portfolioHelper;
}
