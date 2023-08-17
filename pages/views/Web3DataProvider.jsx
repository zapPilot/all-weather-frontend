import React, { createContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const web3Context = createContext();

const Web3DataProvider = ({ children, address }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch data from API
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.providers.JsonRpcProvider(
          process.env.NEXT_RPC_URL,
        );
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          "0x52B1CA27095283a359Cc46F1dE04f6123e289935",
          permanentPortfolioJson.abi,
          signer,
        );
        const userShares = await contract.balanceOf(address);

        const totalSupply = await contract.totalSupply();

        fetch(`${API_URL}/debank`)
          .then((response) => response.json())
          .then((result) => {
            setData({
              debankContext: result,
              portfolioContract: contract,
              userShares,
              totalSupply,
            });
          })
          .catch((error) => console.error("Error:", error));
      }
    }
    fetchData();
  }, []);

  return <web3Context.Provider value={data}>{children}</web3Context.Provider>;
};

export default Web3DataProvider;
