import { AllWeatherPortfolio } from "../classes/AllWeatherPortfolio";
import { StablecoinVault } from "../classes/Vaults/StablecoinVault";
import { EthVault } from "../classes/Vaults/EthVault";
import { gDaiVault } from "../classes/Vaults/gDaiVault";
import { YearnVault } from "../classes/Vaults/Tests/YearnVault";
import { EquilibriaETHVault } from "../classes/Vaults/Tests/EquilibriaETHVault";
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
  } else if (portfolioName === "gDAI") {
    // TODO(david): can remove gDAI vault once our Eugene has zap out
    portfolioHelper = new gDaiVault();
  } else if (portfolioName === "Yearn Vault") {
    // for testing
    portfolioHelper = new YearnVault();
  } else if (portfolioName === "Equilibria ETH Vault") {
    // for testing
    portfolioHelper = new EquilibriaETHVault();
  } else {
    return;
  }
  return portfolioHelper;
}
