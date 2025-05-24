import { StablecoinVault } from "../classes/Vaults/StablecoinVault";
import { EthVault } from "../classes/Vaults/EthVault";
import { BtcVault } from "../classes/Vaults/BtcVault";
import { ConvexStablecoinVault } from "../classes/Vaults/Tests/ConvexStablecoinVault";
import { YearnVault } from "../classes/Vaults/Tests/YearnVault";
import { EquilibriaETHVault } from "../classes/Vaults/Tests/EquilibriaETHVault";
import { BasePortfolio } from "../classes/BasePortfolio";
import { MoonwellStablecoinVault } from "../classes/Vaults/Tests/MoonwellStablecoinVault";
import { Index500Vault } from "../classes/Vaults/Index500Vault";
import { MetisVault } from "../classes/Vaults/MetisVault";
import { CamelotVault } from "../classes/Vaults/Tests/CamelotVault";
import { VelodromeVault } from "../classes/Vaults/Tests/VelodromeVault";
import { VenusStablecoinVault } from "../classes/Vaults/Tests/VenusVault";
import { VelaVault } from "../classes/Vaults/VelaVault";
import { DeprecatedVault } from "../classes/Vaults/DeprecatedVault";

export function getPortfolioHelper(
  portfolioName: string,
): BasePortfolio | undefined {
  let portfolioHelper: BasePortfolio;
  if (portfolioName === "Stable+ Vault") {
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
  } else if (portfolioName === "Index 500 Vault") {
    portfolioHelper = new Index500Vault();
  } else if (portfolioName === "Camelot Vault") {
    portfolioHelper = new CamelotVault();
  } else if (portfolioName === "Velodrome Vault") {
    portfolioHelper = new VelodromeVault();
  } else if (portfolioName === "Venus Stablecoin Vault") {
    portfolioHelper = new VenusStablecoinVault();
  } else if (portfolioName === "Vela Vault (Deprecated)") {
    portfolioHelper = new VelaVault();
  } else if (portfolioName === "Deprecated Vault") {
    portfolioHelper = new DeprecatedVault();
  } else {
    return;
  }
  return portfolioHelper;
}
