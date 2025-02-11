import { StablecoinVault } from "../classes/Vaults/StablecoinVault";
import { EthVault } from "../classes/Vaults/EthVault";
import { BtcVault } from "../classes/Vaults/BtcVault";
import { ConvexStablecoinVault } from "../classes/Vaults/Tests/ConvexStablecoinVault";
import { YearnVault } from "../classes/Vaults/Tests/YearnVault";
import { EquilibriaETHVault } from "../classes/Vaults/Tests/EquilibriaETHVault";
import { BasePortfolio } from "../classes/BasePortfolio";
import { MoonwellStablecoinVault } from "../classes/Vaults/Tests/MoonwellStablecoinVault";
import { AllWeatherVault } from "../classes/Vaults/AllWeatherVault";
import { MetisVault } from "../classes/Vaults/MetisVault";
import { CamelotVault } from "../classes/Vaults/Tests/CamelotVault";
export function getPortfolioHelper(
  portfolioName: string,
): BasePortfolio | undefined {
  let portfolioHelper: BasePortfolio;
  if (portfolioName === "Stablecoin Vault") {
    portfolioHelper = new StablecoinVault();
  } else if (portfolioName === "ETH Vault") {
    portfolioHelper = new EthVault();
  } else if (portfolioName === "Metis Vault") {
    portfolioHelper = new MetisVault();
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
  } else if (portfolioName === "All Weather Vault") {
    portfolioHelper = new AllWeatherVault();
  } else if (portfolioName === "Camelot Vault") {
    portfolioHelper = new CamelotVault();
  } else {
    return;
  }
  return portfolioHelper;
}
