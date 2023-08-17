import { Spin, Row, Col, Button } from "antd";
import { DollarOutlined, FireOutlined } from "@ant-design/icons";
import { useEffect, useState, useContext } from "react";
import { web3Context } from "./Web3DataProvider";

const UserBalanceInfo = ({ address, tvl }) => {
  const WEB3_CONTEXT = useContext(web3Context);
  const [userShares, setUserShares] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);

  useEffect(() => {
    async function fetchSharesInfo() {
      if (WEB3_CONTEXT) {
        const userShares_ = await WEB3_CONTEXT.portfolioContract.balanceOf(
          address,
        );
        setUserShares(userShares_);

        const totalSupply_ = await WEB3_CONTEXT.portfolioContract.totalSupply();
        setTotalSupply(totalSupply_);
      }
    }
    fetchSharesInfo();
  }, []);

  return (
    <div style={{ textAlign: "left", marginBottom: 20 }}>
      <text style={{ color: "white", fontSize: 12, marginRight: 15 }}>
        Your Deposit: ${(userShares / totalSupply) * tvl.toFixed(2)}
      </text>
      <text style={{ color: "white", fontSize: 12 }}>
        Your Share: {(userShares / totalSupply).toFixed(2)}%
      </text>
    </div>
  );
};

export default UserBalanceInfo;
