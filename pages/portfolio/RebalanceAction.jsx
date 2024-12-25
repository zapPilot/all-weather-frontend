import { Button } from "antd";
import TokenDropdownInput from "../views/TokenDropdownInput";

export default function RebalanceAction({
  chainId,
  handleAAWalletAction,
  rebalanceIsLoading,
  rebalancableUsdBalanceDictLoading,
  getRebalanceReinvestUsdAmount,
  usdBalance,
  portfolioHelper,
  calCurrentAPR,
  rebalancableUsdBalanceDict,
  portfolioApr,
  portfolioName,
  switchChain,
  base,
  selectedToken,
  handleSetSelectedToken,
  handleSetInvestmentAmount,
  zapInIsLoading,
  investmentAmount,
  tokenBalance,
}) {
  return (
    <div>
    <p>Step 1: Rebalance to boost APR on arbitrum chain.</p>
    <Button
      className="w-full mt-2"
      type="primary"
      onClick={() => handleAAWalletAction("rebalance", true)}
      loading={rebalanceIsLoading || rebalancableUsdBalanceDictLoading}
      disabled={
        getRebalanceReinvestUsdAmount() / usdBalance <
          portfolioHelper?.rebalanceThreshold() || usdBalance <= 0
      }
    >
      {calCurrentAPR(rebalancableUsdBalanceDict) >
      portfolioApr[portfolioName]?.portfolioAPR * 100 ? (
        "Take Profit"
      ) : (
        <>
          Boost APR from{" "}
          <span className="text-red-500">
            {calCurrentAPR(rebalancableUsdBalanceDict).toFixed(2)}%{" "}
          </span>
          to{" "}
          <span className="text-green-400">
            {(portfolioApr[portfolioName]?.portfolioAPR * 100).toFixed(2)}
            %
          </span>{" "}
          for
          {formatBalance(getRebalanceReinvestUsdAmount())}
        </>
      )}
    </Button>
    <p>Step 2: Switch to base chain and zap in again.</p>
    <Button
      type="primary"
      className={`w-full my-2 
        ${
          chainId?.name.toLowerCase().replace(" one", "").trim() ===
          "arbitrum"
            ? "block"
            : "hidden"
        }`}
      onClick={() => switchChain(base)}
      loading={rebalanceIsLoading || rebalancableUsdBalanceDictLoading}
      disabled={
        getRebalanceReinvestUsdAmount() / usdBalance <
          portfolioHelper?.rebalanceThreshold() || usdBalance <= 0
      }
    >
      switch to base Chain
    </Button>
    <div
      className={`mt-4 ${
        chainId?.name.toLowerCase().replace(" one", "").trim() === "base"
          ? "block"
          : "hidden"
      }`}
    >
      <TokenDropdownInput
        selectedToken={selectedToken}
        setSelectedToken={handleSetSelectedToken}
        setInvestmentAmount={handleSetInvestmentAmount}
      />
      <Button
        type="primary"
        className="w-full my-2"
        onClick={() => handleAAWalletAction("zapIn", true)}
        loading={zapInIsLoading}
        disabled={
          Number(investmentAmount) === 0 ||
          Number(investmentAmount) > tokenBalance
        }
      >
        Enter amount to Zap In on current chain
      </Button>
    </div>
    <div className="text-gray-400">
      Rebalance Cost: {portfolioHelper?.swapFeeRate() * 100}%
    </div>
    {calCurrentAPR(rebalancableUsdBalanceDict) >
    portfolioApr[portfolioName]?.portfolioAPR * 100 ? (
      <>
        {formatBalance(getRebalanceReinvestUsdAmount())} has outperformed.
        It&apos;s time to rebalance and take the profit!
      </>
    ) : null}
  </div>
  );
} 