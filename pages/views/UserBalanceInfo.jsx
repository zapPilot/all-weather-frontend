import { useEffect, useState } from "react";
const BigNumber = require("bignumber.js");

const UserBalanceInfo = ({
  netWorth,
  netWorthWithCustomLogic,
  portfolioApr,
  claimableRewards,
}) => {
  const [userShares, setUserShares] = useState(0);
  const [totalSupply, setTotalSupply] = useState(1);
  const [exchangeRates, setExchangeRates] = useState({});

  useEffect(() => {
    async function fetchExchangeRate() {
      fetch("https://api.exchangerate-api.com/v4/latest/USD", {
        // Replace with your API endpoint
        method: "GET",
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw response;
        })
        .then((data) => {
          setExchangeRates(data.rates);
        })
        .catch((error) => {
          console.error("Error fetching data: ", error);
          setError(error);
        });
    }
    fetchExchangeRate();
  }, []);

  const userPercentage = new BigNumber(userShares).div(totalSupply);
  const userDeposit =
    process.env.NEXT_PUBLIC_DAVID_PORTFOLIO === "true"
      ? netWorthWithCustomLogic
      : userPercentage * netWorth;

  return (
    <div
      style={{
        marginTop: 20,
        color: "white",
      }}
    >
      <h3>Your Deposit: ${userDeposit}</h3>
      <b style={{ color: "#555555" }}>
        Your Share: {userPercentage.times(100).toFixed(2)}%
      </b>
      <h3>
        Monthly Interest: $
        {((userDeposit * portfolioApr) / 100 / 12).toFixed(2)}
        <b style={{ color: "#555555" }}>
          &nbsp;(NTD:{" "}
          {(
            (userDeposit * exchangeRates["TWD"] * portfolioApr) /
            100 /
            12
          ).toFixed(2)}
          )
        </b>
      </h3>
      <h3>
        <b style={{ color: "#555555" }}>
          Claimable Rewards in the Portfolio: $
          {(claimableRewards ?? 0).toFixed(2)}
          &nbsp;(NTD: {(claimableRewards * exchangeRates["TWD"])?.toFixed(2)})
        </b>
      </h3>
    </div>
  );
};

export default UserBalanceInfo;
