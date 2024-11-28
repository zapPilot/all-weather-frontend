import { AllWeatherPortfolio } from "../classes/AllWeatherPortfolio";
import { StablecoinVault } from "../classes/Vaults/StablecoinVault";
import { EthVault } from "../classes/Vaults/EthVault";
import { BtcVault } from "../classes/Vaults/BtcVault";
import { ConvexStablecoinVault } from "../classes/Vaults/Tests/ConvexStablecoinVault";
import { YearnVault } from "../classes/Vaults/Tests/YearnVault";
import { EquilibriaETHVault } from "../classes/Vaults/Tests/EquilibriaETHVault";
import { BasePortfolio } from "../classes/BasePortfolio";
import { MoonwellStablecoinVault } from "../classes/Vaults/Tests/MoonwellStablecoinVault";
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
  } else if (portfolioName === "BTC Vault") {
    portfolioHelper = new BtcVault();
  } else if (portfolioName === "Yearn Vault") {
    // for testing
    portfolioHelper = new YearnVault();
  } else if (portfolioName === "Equilibria ETH Vault") {
    // for testing
    portfolioHelper = new EquilibriaETHVault();
  } else if (portfolioName === "Convex Stablecoin Vault") {
    // for testing
    portfolioHelper = new ConvexStablecoinVault();
  } else if (portfolioName === "Moonwell Stablecoin Vault") {
    // for testing
    portfolioHelper = new MoonwellStablecoinVault();
  } else {
    return;
  }
  return portfolioHelper;
}
