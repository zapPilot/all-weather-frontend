import { Button, Space, Select } from "antd";
import { portfolioContractAddress } from "../../utils/oneInch";
import NumericInput from "./NumberInput";
import { DollarOutlined } from "@ant-design/icons";
import { useEffect, useState, useContext } from "react";
import { useContractWrite, useContractRead, useAccount } from "wagmi";
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
  const [approveReady, setApproveReady] = useState(true);
  const [approveAmount, setApproveAmount] = useState(0);

  const { write } = useContractWrite({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "redeem",
  });
  const {
    write: approveWrite,
    isLoading: approveIsLoading,
    isSuccess: approveIsSuccess,
  } = useContractWrite({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "approve",
  });
  const approveAmountContract = useContractRead({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "allowance",
    args: [address, portfolioContractAddress],
    onError(error) {
      console.log("allowance Error", error);
    },
  });

  useEffect(() => {
    if (WEB3_CONTEXT) {
      setUserShares(WEB3_CONTEXT.userShares);
    }
    if (approveAmountContract.loading === true) return; // Don't proceed if loading
    setApproveAmount(approveAmountContract.data);
  }, [WEB3_CONTEXT, address, approveAmountContract.loading, approveReady]);
  const handleInputChange = async (eventValue) => {
    setInputValue(eventValue);
    if (eventValue !== "") {
      const withdrawAmount_ = eventValue;
      setWithdrawAmount(withdrawAmount_);
    }
    if (approveAmount < eventValue) {
      setApproveReady(false);
    }
  };

  const handleOnClickMax = async () => {
    const withdrawAmount_ = userShares.toString();
    setWithdrawAmount(withdrawAmount_);
    setInputValue(userShares);
    // TODO(david): find a better way to implement.
    // Since `setInputValue` need some time to propagate, the `inputValue` would be 0 at the first click.
    // then be updated to the correct value at the second click.
    if (approveAmount < inputValue || inputValue === 0) {
      setApproveReady(false);
    }
  };

  const handleZapOut = async () => {
    if (approveAmount < inputValue) {
      approveWrite({
        args: [portfolioContractAddress, ethers.BigNumber.from(inputValue)],
        from: address,
      });
      setApproveReady(true);
    }
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
