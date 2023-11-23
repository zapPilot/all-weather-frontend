import { useEffect, useState, useContext } from "react";
import { web3Context } from "./Web3DataProvider";
const BigNumber = require("bignumber.js");

const UserBalanceInfo = ({ tvl }) => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [userShares, setUserShares] = useState(0);
  const [totalSupply, setTotalSupply] = useState(1);

  useEffect(() => {
    async function fetchSharesInfo() {
      if (WEB3_CONTEXT) {
        setUserShares(
          WEB3_CONTEXT.userShares === undefined ? 0 : WEB3_CONTEXT.userShares,
        );
        setTotalSupply(
          WEB3_CONTEXT.totalSupply === undefined ? 0 : WEB3_CONTEXT.totalSupply,
        );
      }
    }
    fetchSharesInfo();
  }, [WEB3_CONTEXT]);

  const userPercentage = new BigNumber(userShares).div(totalSupply);
  const userDeposit = userPercentage * parseFloat(tvl ? tvl.toFixed(2) : 0);

  return (
    <div
      style={{
        marginTop: 20,
        color: "white",
      }}
    >
      <h3>
        Your Deposit: ${userDeposit}
      </h3>
      <b>
        Your Share: {userPercentage.times(100).toFixed(2)}%
      </b>
    </div>
  );
};

export default UserBalanceInfo;
