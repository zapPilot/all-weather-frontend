import { useEffect, useState, useContext } from "react";
import { web3Context } from "./Web3DataProvider";

const UserBalanceInfo = ({ address, tvl }) => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [userShares, setUserShares] = useState(0);
  const [totalSupply, setTotalSupply] = useState(1);

  useEffect(() => {
    async function fetchSharesInfo() {
      if (WEB3_CONTEXT) {
        setUserShares(WEB3_CONTEXT.userShares);
        setTotalSupply(WEB3_CONTEXT.totalSupply);
      }
    }
    fetchSharesInfo();
  }, [WEB3_CONTEXT]);

  const userPercentage = (totalSupply === 0n) ? 0 : (userShares / totalSupply).toFixed(2);
  const userDeposit = userPercentage * parseFloat(tvl.toFixed(2));

  return (
    <div style={{ textAlign: "left", marginBottom: 20 }}>
      <span style={{ color: "white", fontSize: 12, marginRight: 15 }}>
        Your Deposit: ${userDeposit}
      </span>
      <span style={{ color: "white", fontSize: 12 }}>
        Your Share: {userPercentage}%
      </span>
    </div>
  );
};

export default UserBalanceInfo;
