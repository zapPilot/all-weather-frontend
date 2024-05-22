import { useEffect, useState } from "react";
const UserBalanceInfo = ({ netWorth, portfolioApr, claimableRewards }) => {
  const [exchangeRates, setExchangeRates] = useState({});
  const [currency, setCurrenty] = useState("USD");
  const [currencyError, setCurrencyError] = useState(false);

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
          setCurrencyError(error);
        });
    }
    const fetchCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        setCurrenty(data.currency);
      } catch (error) {
        setCurrencyError(true);
      }
    };
    fetchExchangeRate();
    fetchCountry();
  }, []);

  const userDeposit = netWorth;
  const calculateMonthlyEarnings = (deposit, apr, exchangeRate = 1) => {
    return (((deposit * apr) / 100 / 12) * exchangeRate).toFixed(2);
  };
  return (
    <div
      style={{
        marginTop: 20,
        color: "white",
      }}
    >
      <h3>Your Deposit: ${userDeposit}</h3>
      <h3 role="monthly_interest">
        Monthly Interest: {currencyError === false ? currency : "USD"}{" "}
        {currencyError === false
          ? calculateMonthlyEarnings(
              userDeposit,
              portfolioApr,
              exchangeRates[currency],
            )
          : calculateMonthlyEarnings(userDeposit, portfolioApr)}
      </h3>
      <h3>
        <b style={{ color: "#555555" }}>
          Claimable Rewards in the Portfolio:{" "}
          {currencyError === false ? currency : "USD"}{" "}
          {currencyError === false
            ? (claimableRewards * exchangeRates[currency])?.toFixed(2)
            : claimableRewards?.toFixed(2)}
        </b>
      </h3>
    </div>
  );
};

export default UserBalanceInfo;
