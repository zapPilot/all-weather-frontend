import { Button, Space, Select } from "antd";
import { portfolioContractAddress } from "../../utils/oneInch";
import NumericInput from "./NumberInput";
import { DollarOutlined } from "@ant-design/icons";
import { useEffect, useState, useContext } from "react";
import { useContractWrite, useAccount } from "wagmi";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";
import { web3Context } from "./Web3DataProvider";
const { ethers } = require("ethers");

const ZapOutButton = () => {
  const { address } = useAccount();
  const WEB3_CONTEXT = useContext(web3Context);
  const normalWording = "Withdraw";
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [userShares, setUserShares] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const { write } = useContractWrite({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "redeem",
  });

  useEffect(() => {
    if (WEB3_CONTEXT) {
      setUserShares(WEB3_CONTEXT.userShares);
    }
    // TODO(david): if WEB#_CONTEXT is not ready, then we won't have userShares. The placeholder will be "Balance: undefined", which needs to be fixed.
  }, []);
  const handleInputChange = async (eventValue) => {
    setInputValue(eventValue);
    if (eventValue !== "") {
      const withdrawAmount_ = ethers.utils.parseEther(eventValue);
      setWithdrawAmount(withdrawAmount_);
    }
  };

  const handleOnClickMax = async () => {
    const withdrawAmount_ = ethers.utils.parseEther(userShares.toString());
    setWithdrawAmount(withdrawAmount_);
    setInputValue(userShares);
  };

  const handleZapOut = async () => {
    write({
      args: [withdrawAmount, address],
      from: address,
    });
  };

  return (
    <div>
      <Space.Compact style={{ width: "90%" }}>
        <NumericInput
          placeholder={`Balance: ${userShares}`}
          value={inputValue}
          onChange={handleInputChange}
        />
        <Button type="primary" onClick={handleOnClickMax}>
          Max
        </Button>
      </Space.Compact>
      <Button
        onClick={handleZapOut} // Added onClick handler
        style={{
          color: "white",
          borderColor: "white",
          paddingInline: 10,
          lineHeight: 1,
          marginRight: 15,
        }}
        shape="round"
        icon={<DollarOutlined />}
        size="small"
      >
        {normalWording}
      </Button>
    </div>
  );
};

export default ZapOutButton;
