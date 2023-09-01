import { Button, Space, Select, Modal } from "antd";
import { Spin } from "antd";
import { z } from "zod";
import {
  fetch1InchSwapData,
  getPendleZapInData,
  wethAddress,
  dpxTokenAddress,
  daiAddress,
  gDAIMarketPoolAddress,
  glpMarketPoolAddress,
  rethMarketPoolAddress,
  rethTokenAddress,
  portfolioContractAddress,
  dpxVaultAddress,
  equilibriaGDAIVaultAddress,
  equilibriaRETHVaultAddress,
} from "../../utils/oneInch";
import { DollarOutlined, CheckCircleOutlined } from "@ant-design/icons";

import { useEffect, useState } from "react";
import {
  useContractWrite,
  useAccount,
  useBalance,
  useContractRead,
} from "wagmi";

import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";
import NumericInput from "./NumberInput";
const { ethers } = require("ethers");
const { Option } = Select;
const MINIMUM_ZAP_IN_AMOUNT = 0.037;
const depositSchema = z
  .number()
  .min(
    MINIMUM_ZAP_IN_AMOUNT,
    `Deposit amount should be greater than ${MINIMUM_ZAP_IN_AMOUNT}`,
  );

const ZapInButton = () => {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const showModal = () => {
    setOpen(true);
  };

  const handleOk = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOpen(false);
    }, 3000);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const { data: wethBalance } = useBalance({
    address,
    token: wethAddress,
    onError(error) {
      console.log("wethBalance, Error", error);
    },
  });

  const normalWording = "Deposit";
  const loadingWording = "Fetching the best route to deposit (23s)";
  const [amount, setAmount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [alert, setAlert] = useState(false);

  const [oneInchSwapDataForDpx, setOneInchSwapDataForDpx] = useState("");
  const [oneInchSwapDataForGDAI, setOneInchSwapDataForGDAI] = useState("");
  const [oneInchSwapDataForRETH, setOneInchSwapDataForRETH] = useState("");
  const [pendleGDAIZapInData, setPendleGDAIZapInData] = useState("");
  const [pendleGLPZapInData, setPendleGLPZapInData] = useState("");
  const [pendleRETHZapInData, setPendleRETHZapInData] = useState("");
  const [apiDataReady, setApiDataReady] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [approveReady, setApproveReady] = useState(true);
  const [approveAmount, setApproveAmount] = useState(0);
  const [isApproved, setIsApproved] = useState(false);
  const renderStatusCircle = (isLoading, isSuccess) => {
    if (isLoading) {
      return <Spin />;
    } else if (isSuccess) {
      return (
        <CheckCircleOutlined style={{ color: "green", marginRight: "10px" }} />
      );
    } else {
      return (
        <div
          style={{
            border: "1px solid white",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            marginRight: "10px",
            display: "inline-block",
          }}
        ></div>
      );
    }
  };
  const {
    write,
    isLoading: depositIsLoading,
    isSuccess: depositIsSuccess,
  } = useContractWrite({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "deposit",
  });
  const {
    write: approveWrite,
    isLoading: approveIsLoading,
    isSuccess: approveIsSuccess,
  } = useContractWrite({
    address: wethAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "approve",
  });
  const approveAmountContract = useContractRead({
    address: wethAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "allowance",
    args: [address, portfolioContractAddress],
    onError(error) {
      console.log("allowance Error", error);
    },
  });

  useEffect(() => {
    if (approveAmountContract.loading === true) return; // Don't proceed if loading
    setApproveAmount(approveAmountContract.data);
  }, [address, approveAmountContract.loading, approveReady, inputValue]);

  const handleInputChange = async (eventValue) => {
    setInputValue(eventValue);
    let amount_;
    amount_ = ethers.utils.parseEther(eventValue);
    setAmount(amount_);
  };
  const handleOnClickMax = async () => {
    setAmount(wethBalance.formatted);
    setInputValue(wethBalance.formatted);
    handleInputChange(wethBalance.formatted);

    // TODO(david): find a better way to implement.
    // Since `setAmount` need some time to propagate, the `amount` would be 0 at the first click.
    // then be updated to the correct value at the second click.
    if (approveAmount < amount || amount === 0) {
      setApproveReady(false);
    }
  };

  const handleZapIn = async () => {
    const validationResult = depositSchema.safeParse(Number(inputValue));
    if (!validationResult.success) {
      setAlert(true);
      return;
    } else {
      setAlert(false);
      showModal();
      let amount_;
      try {
        amount_ = ethers.utils.parseEther(inputValue);
        setAmount(amount_);
      } catch (error) {
        return;
      }
      setAmount(amount_);
      // check the type of amount and the approveAmount
      if (approveAmountContract.data < amount_) {
        setApiDataReady(false);
        approveWrite({
          args: [portfolioContractAddress, amount.toString()],
          from: address,
        });
        // wait until the approve transaction is successful
        if (approveIsSuccess) {
          setApproveReady(true);
        }
      } else {
        setApproveReady(true);
      }
      setApiLoading(true);
      const amountAfterChargingFee = amount_.mul(997).div(1000);
      const [
        oneInchSwapDataForDpx,
        oneInchSwapDataForGDAI,
        oneInchSwapDataForRETH,
      ] = await Promise.all([
        fetch1InchSwapData(
          42161,
          wethAddress,
          dpxTokenAddress,
          amountAfterChargingFee.div(8),
          dpxVaultAddress,
          1,
        ),
        fetch1InchSwapData(
          42161,
          wethAddress,
          daiAddress,
          amountAfterChargingFee.div(4),
          equilibriaGDAIVaultAddress,
          1,
        ),
        fetch1InchSwapData(
          42161,
          wethAddress,
          rethTokenAddress,
          amountAfterChargingFee.div(4),
          equilibriaRETHVaultAddress,
          1,
        ),
      ]);
      const [pendleGDAIZapInData, pendleGLPZapInData, pendleRETHZapInData] =
        await Promise.all([
          getPendleZapInData(
            42161,
            gDAIMarketPoolAddress,
            ethers.BigNumber.from(oneInchSwapDataForGDAI.toAmount)
              .mul(99)
              .div(100),
            0.01,
            daiAddress,
          ),
          getPendleZapInData(
            42161,
            glpMarketPoolAddress,
            amountAfterChargingFee.div(4),
            0.01,
            wethAddress,
          ),
          getPendleZapInData(
            42161,
            rethMarketPoolAddress,
            ethers.BigNumber.from(oneInchSwapDataForRETH.toAmount)
              .mul(99)
              .div(100),
            0.01,
            rethTokenAddress,
          ),
        ]);

      // Define any parameters required by the deposit function
      pendleGLPZapInData[3]["eps"] = ethers.BigNumber.from(
        pendleGLPZapInData[3]["eps"],
      );
      pendleGLPZapInData[3]["guessMax"] = ethers.BigNumber.from(
        pendleGLPZapInData[3]["guessMax"],
      );
      pendleGLPZapInData[3]["guessMin"] = ethers.BigNumber.from(
        pendleGLPZapInData[3]["guessMin"],
      );
      pendleGLPZapInData[3]["guessOffchain"] = ethers.BigNumber.from(
        pendleGLPZapInData[3]["guessOffchain"],
      );
      pendleGLPZapInData[4]["netTokenIn"] = ethers.BigNumber.from(
        pendleGLPZapInData[4]["netTokenIn"],
      );

      pendleGDAIZapInData[3]["guessMax"] = ethers.BigNumber.from(
        pendleGDAIZapInData[3]["guessMax"],
      );
      pendleGDAIZapInData[3]["guessMin"] = ethers.BigNumber.from(
        pendleGDAIZapInData[3]["guessMin"],
      );
      pendleGDAIZapInData[3]["guessOffchain"] = ethers.BigNumber.from(
        pendleGDAIZapInData[3]["guessOffchain"],
      );
      pendleGDAIZapInData[4]["netTokenIn"] = ethers.BigNumber.from(
        pendleGDAIZapInData[4]["netTokenIn"],
      );

      pendleRETHZapInData[3]["guessMax"] = ethers.BigNumber.from(
        pendleRETHZapInData[3]["guessMax"],
      );
      pendleRETHZapInData[3]["guessMin"] = ethers.BigNumber.from(
        pendleRETHZapInData[3]["guessMin"],
      );
      pendleRETHZapInData[3]["guessOffchain"] = ethers.BigNumber.from(
        pendleRETHZapInData[3]["guessOffchain"],
      );
      pendleRETHZapInData[4]["netTokenIn"] = ethers.BigNumber.from(
        pendleRETHZapInData[4]["netTokenIn"],
      );

      const preparedDepositData = {
        amount: ethers.BigNumber.from(amount),
        receiver: address,
        oneInchDataDpx: oneInchSwapDataForDpx.tx.data,
        glpMinLpOut: ethers.BigNumber.from(pendleGLPZapInData[2]),
        glpGuessPtReceivedFromSy: pendleGLPZapInData[3],
        glpInput: pendleGLPZapInData[4],
        gdaiMinLpOut: ethers.BigNumber.from(pendleGDAIZapInData[2]),
        gdaiGuessPtReceivedFromSy: pendleGDAIZapInData[3],
        gdaiInput: pendleGDAIZapInData[4],
        gdaiOneInchDataGDAI: oneInchSwapDataForGDAI.tx.data,
        rethMinLpOut: ethers.BigNumber.from(pendleRETHZapInData[2]),
        rethGuessPtReceivedFromSy: pendleRETHZapInData[3],
        rethInput: pendleRETHZapInData[4],
        rethOneInchDataRETH: oneInchSwapDataForRETH.tx.data,
      };
      setApiLoading(false);
      setApiDataReady(true);

      // wait for the write function to be called
      function waitForWrite() {
        if (write) {
          write({
            args: [preparedDepositData],
            from: address,
          });
          return;
        }
        setTimeout(waitForWrite, 3000);
      }
      waitForWrite();
    }
  };
  const selectBefore = (
    <Select
      defaultValue="WETH"
      theme="light"
      style={{ backgroundColor: "white" }}
    >
      <Option value="WETH">WETH</Option>
    </Select>
  );
  const modalContent = (
    <Modal
      visible={open}
      closeIcon={<> </>}
      onCancel={handleCancel}
      bodyStyle={{ backgroundColor: "black", color: "white" }} // Set background and font color for the body
      wrapClassName="black-modal" // Custom class to style the modal wrapper
      footer={[
        <Button
          key="back"
          onClick={handleCancel}
          style={{
            color: "black",
            backgroundColor: "#beed54",
            borderColor: "#beed54",
          }}
        >
          Return
        </Button>,
      ]}
    >
      <div
        style={{
          border: "2px solid #beed54",
          borderRadius: "1rem",
          padding: "10px", // This creates a margin-like effect for the border
          margin: "10px", // Adjust this value to set the distance of the border from the modal frame
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          {renderStatusCircle(approveIsLoading, approveReady)}
          <span> Approve </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          {renderStatusCircle(apiLoading, apiDataReady)}
          <span> Fetching the best route </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          {renderStatusCircle(depositIsLoading, depositIsSuccess)}
          <span> Deposit </span>
        </div>
      </div>
    </Modal>
  );

  return (
    <div>
      {modalContent}
      <Space.Compact style={{ width: "90%" }}>
        <NumericInput
          addonBefore={selectBefore}
          placeholder={`Balance: ${wethBalance ? wethBalance.formatted : 0}`}
          value={inputValue}
          onChange={(value) => {
            handleInputChange(value);
          }}
        />
        <Button type="primary" onClick={handleOnClickMax}>
          Max
        </Button>
      </Space.Compact>
      <div style={{ color: "white" }}>Max Slippage: 1%</div>

      <Button
        loading={!apiDataReady}
        onClick={handleZapIn} // Added onClick handler
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
        {/* {!approveReady ? approvingWording : apiDataReady ? normalWording : loadingWording} */}
        {apiDataReady ? normalWording : loadingWording}
      </Button>
      {alert && (
        // make text color red, and state please enter an amount larger than 0.01
        <div style={{ color: "red" }}>
          Please enter an amount greater than {MINIMUM_ZAP_IN_AMOUNT}
        </div>
      )}
    </div>
  );
};

export default ZapInButton;
