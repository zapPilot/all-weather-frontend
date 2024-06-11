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
    <div className="text-white mt-2">
      <div className="flex justify-between">
        <span className="text-gray-400">Your Deposit</span>
        <span>${userDeposit}</span>
      </div>
      <div
        className="flex justify-between"
        role="monthly_interest"
      >
        <span className="text-gray-400">Monthly Interest</span>
        <span>
          {currencyError === false ? currency : "USD"}{" "}
          {currencyError === false
            ? calculateMonthlyEarnings(
                userDeposit,
                portfolioApr,
                exchangeRates[currency],
              )
            : calculateMonthlyEarnings(userDeposit, portfolioApr)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Claimable Rewards in the Portfolio{" "}</span>
        <span>
          {currencyError === false ? currency : "USD"}{" "}
          {currencyError === false
            ? (claimableRewards * exchangeRates[currency])?.toFixed(2)
            : claimableRewards?.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default UserBalanceInfo;
