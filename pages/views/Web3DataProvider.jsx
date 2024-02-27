import React, { createContext, useState, useEffect } from "react";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";
import { useReadContract } from "wagmi";
import { portfolioContractAddress } from "../../utils/oneInch";
import useRebalanceSuggestions from "../../utils/rebalanceSuggestions";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const web3Context = createContext();

const Web3DataProvider = ({ children, address }) => {
  const [data, setData] = useState({});
  const {
    data: dataOfGetClaimableRewards,
    error: dataOfGetClaimableRewardsError,
    isLoading: dataOfGetClaimableRewardsIsLoading,
  } = useReadContract({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "getClaimableRewards",
    args: [address],
  });

  if (dataOfGetClaimableRewardsError)
    console.log(
      "getClaimableRewards Error",
      dataOfGetClaimableRewardsError.message,
    );

  const { data: userShares, isLoading: userSharesIsLoading } = useReadContract({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "balanceOf",
    args: [address],
    onError(error) {
      console.log("userShares Error", error);
    },
  });
  const { data: totalSupply, isPending: totalSupplyIsPending } =
    useReadContract({
      address: portfolioContractAddress,
      abi: permanentPortfolioJson.abi,
      functionName: "totalSupply",
      onError(error) {
        console.log("totalSupply Error", error);
      },
    });

  const {
    netWorth,
    rebalanceSuggestions,
    totalInterest,
    portfolioApr,
    aggregatedPositions,
    topNLowestAprPools,
    topNPoolConsistOfSameLpToken,
    topNStableCoins,
    sharpeRatio,
    ROI,
    maxDrawdown,
    claimableRewards,
  } = useRebalanceSuggestions();

  useEffect(() => {
    async function fetchData() {
      if (
        dataOfGetClaimableRewardsIsLoading ||
        userSharesIsLoading ||
        totalSupplyIsPending
      )
        return; // Don't proceed if loading
      // Fetch data from API

      fetch(`${API_URL}/debank?worksheet=bsc_contract`)
        .then((response) => response.json())
        .then((result) => {
          setData({
            debankContext: result,
            dataOfGetClaimableRewards: dataOfGetClaimableRewards,
            userShares: userShares,
            totalSupply: totalSupply,
            /* $25866 stands for the TVL from this vault: https://debank.com/profile/0xd56d8dfd3a3d6f6dafc0b7b6945f6e7ab138706e */
            netWorthWithCustomLogic:
              process.env.NEXT_PUBLIC_DAVID_PORTFOLIO !== "true"
                ? (netWorth + 25873).toFixed(2)
                : netWorth.toFixed(2),
            netWorth: netWorth.toFixed(2),
            rebalanceSuggestions,
            totalInterest,
            portfolioApr,
            aggregatedPositions,
            topNLowestAprPools,
            topNPoolConsistOfSameLpToken,
            topNStableCoins,
            sharpeRatio,
            ROI,
            maxDrawdown,
            claimableRewards,
            address,
          });
        })
        .catch((error) => console.error("Error:", error));
    }
    fetchData();
  }, [
    address,
    dataOfGetClaimableRewardsIsLoading,
    dataOfGetClaimableRewards,
    userSharesIsLoading,
    userShares,
    totalSupplyIsPending,
    totalSupply,
    portfolioApr,
  ]);

  return <web3Context.Provider value={data}>{children}</web3Context.Provider>;
};

export default Web3DataProvider;
