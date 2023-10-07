import { Button, Space, Select, Modal, message } from "antd";
import { Spin } from "antd";
import { z } from "zod";
import { encodeFunctionData } from "viem";
import {
  fetch1InchSwapData,
  getPendleZapInData,
  wethAddress,
  magicTokenAddress,
  daiAddress,
  gDAIMarketPoolAddress,
  glpMarketPoolAddress,
  rethMarketPoolAddress,
  pendleMarketPoolAddress,
  rethTokenAddress,
  portfolioContractAddress,
  magicVaultAddress,
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
import { ethers } from "ethers";
import { sendDiscordMessage } from "../../utils/discord";
const { Option } = Select;
const MINIMUM_ZAP_IN_AMOUNT = 0.05;
const MAXIMUM_ZAP_IN_AMOUNT = 0.07;
const depositSchema = z
  .number()
  .min(
    MINIMUM_ZAP_IN_AMOUNT - 0.000000001,
    `The deposit amount should be at least ${MINIMUM_ZAP_IN_AMOUNT}`,
  )
  .max(
    MAXIMUM_ZAP_IN_AMOUNT,
    `The deposit amount should be at most ${MAXIMUM_ZAP_IN_AMOUNT}`,
  );

const ZapInButton = () => {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const showModal = () => {
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const { data: wethBalance } = useBalance({
    address,
    token: wethAddress,
    onError(error) {
      console.log("wethBalance, Error", error);
      throw error;
    },
  });

  const normalWording = "Deposit";
  const loadingWording = "Fetching the best route to deposit (23s)";
  const [amount, setAmount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [alert, setAlert] = useState(false);

  const [apiDataReady, setApiDataReady] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [approveReady, setApproveReady] = useState(true);
  const [approveAmount, setApproveAmount] = useState(0);
  const [depositHash, setDepositHash] = useState(undefined);
  const [messageApi, contextHolder] = message.useMessage();
  const roleIdOfMod = "<@&1108070617753862156>";
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
    onError(error) {
      sendDiscordMessage(`${roleIdOfMod}, ${address} handleZapin failed!`);
      messageApi.error({
        content: `${error.shortMessage}. Amout: ${error.args[0].amount}. Increase the deposit amount and try again.`,
        duration: 5,
      });
      throw error;
    },
    onSuccess(data) {
      sendDiscordMessage(`${roleIdOfMod}, ${address} handleZapin succeeded!`);
      setDepositHash(data.hash);
      messageApi.info("Deposit succeeded");
    },
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
    watch: true,
    onError(error) {
      console.log("allowance Error", error);
      throw error;
    },
  });

  useEffect(() => {
    if (approveAmountContract.loading === true) return; // Don't proceed if loading
    setApproveAmount(approveAmountContract.data);
  }, [
    address,
    approveAmountContract.loading,
    approveAmountContract.data,
    approveReady,
    inputValue,
  ]);

  const handleInputChange = async (eventValue) => {
    if (eventValue === "") {
      return;
    }
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
    await sendDiscordMessage(`${roleIdOfMod}, ${address} starts handleZapin()`);
    const validationResult = depositSchema.safeParse(Number(inputValue));
    if (!validationResult.success) {
      setAlert(true);
      return;
    }
    await _sendDepositTransaction();
    _sendEvents();
  };

  const _sendDepositTransaction = async () => {
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
      function waitForApprove() {
        if (approveWrite) {
          approveWrite({
            args: [portfolioContractAddress, amount.toString()],
            from: address,
          });
          return;
        }
        setTimeout(waitForApprove, 3000);
      }
      waitForApprove();
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
      oneInchSwapDataForMagic,
      oneInchSwapDataForGDAI,
      oneInchSwapDataForRETH,
    ] = await Promise.all([
      fetch1InchSwapData(
        42161,
        wethAddress,
        magicTokenAddress,
        amountAfterChargingFee.mul(8).div(200),
        magicVaultAddress,
        2,
      ),
      fetch1InchSwapData(
        42161,
        wethAddress,
        daiAddress,
        amountAfterChargingFee.mul(12).div(100),
        equilibriaGDAIVaultAddress,
        2,
      ),
      fetch1InchSwapData(
        42161,
        wethAddress,
        rethTokenAddress,
        amountAfterChargingFee.mul(6).div(100),
        equilibriaRETHVaultAddress,
        2,
      ),
    ]);
    const [
      pendleGDAIZapInData,
      pendleGLPZapInData,
      pendleRETHZapInData,
      pendlePendleZapInData,
    ] = await Promise.all([
      getPendleZapInData(
        42161,
        gDAIMarketPoolAddress,
        ethers.BigNumber.from(oneInchSwapDataForGDAI.toAmount).mul(99).div(100),
        0.02,
        daiAddress,
      ),
      getPendleZapInData(
        42161,
        glpMarketPoolAddress,
        amountAfterChargingFee.mul(35).div(100),
        0.02,
        wethAddress,
      ),
      getPendleZapInData(
        42161,
        rethMarketPoolAddress,
        ethers.BigNumber.from(oneInchSwapDataForRETH.toAmount).mul(99).div(100),
        0.02,
        rethTokenAddress,
      ),
      getPendleZapInData(
        42161,
        pendleMarketPoolAddress,
        amountAfterChargingFee.mul(24).div(100),
        0.02,
        wethAddress,
      ),
    ]);

    // Define any parameters required by the deposit function
    const dataArrays = [
      pendleGLPZapInData,
      pendleGDAIZapInData,
      pendleRETHZapInData,
      pendlePendleZapInData,
    ];
    const keysToUpdate = [
      "eps",
      "guessMax",
      "guessMin",
      "guessOffchain",
      "netTokenIn",
    ];
    const indicesToUpdate = [3, 4];

    for (let dataArray of dataArrays) {
      for (let index of indicesToUpdate) {
        for (let key of keysToUpdate) {
          if (dataArray[index] && dataArray[index][key] !== undefined) {
            dataArray[index][key] = ethers.BigNumber.from(
              dataArray[index][key],
            );
          }
        }
      }
    }

    // WORKAROUND: pendle SDK would return the wrong path for zapping in for small amount (with MIM route)
    // so we need to provide a hardcoded path, though not guaranteed to be the best route
    // workaround on pendle router side: https://stackblitz.com/edit/stackblitz-starters-lov3oa?file=index.ts
    const glpInputWorkAround = {
      tokenIn: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      netTokenIn: pendleGLPZapInData[4]["netTokenIn"],
      tokenMintSy: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      bulk: "0x0000000000000000000000000000000000000000",
      pendleSwap: "0x0000000000000000000000000000000000000000",
      swapData: {
        swapType: 0,
        extRouter: "0x0000000000000000000000000000000000000000",
        extCalldata: [],
        needScale: false,
      },
    };
    const preparedDepositData = {
      amount: ethers.BigNumber.from(amount),
      receiver: address,
      glpMinLpOut: ethers.BigNumber.from(pendleGLPZapInData[2]),
      glpGuessPtReceivedFromSy: pendleGLPZapInData[3],
      // glpInput: pendleGLPZapInData[4],
      glpInput: glpInputWorkAround,
      gdaiMinLpOut: ethers.BigNumber.from(pendleGDAIZapInData[2]),
      gdaiGuessPtReceivedFromSy: pendleGDAIZapInData[3],
      gdaiInput: pendleGDAIZapInData[4],
      gdaiOneInchDataGDAI: oneInchSwapDataForGDAI.tx.data,
      rethMinLpOut: ethers.BigNumber.from(pendleRETHZapInData[2]),
      rethGuessPtReceivedFromSy: pendleRETHZapInData[3],
      rethInput: pendleRETHZapInData[4],
      rethOneInchDataRETH: oneInchSwapDataForRETH.tx.data,
      oneInchDataMagic: oneInchSwapDataForMagic.tx.data,
      pendleMinLpOut: ethers.BigNumber.from(pendlePendleZapInData[2]),
      pendleGuessPtReceivedFromSy: pendlePendleZapInData[3],
      pendleInput: pendlePendleZapInData[4],
    };
    // print out the encoded data for debugging
    const encodedFunctionData = encodeFunctionData({
      abi: permanentPortfolioJson.abi,
      functionName: "deposit",
      args: [preparedDepositData],
    });
    setApiLoading(false);
    setApiDataReady(true);
    function waitForWrite() {
      if (write) {
        write({
          args: [preparedDepositData],
          from: address,
          gas: 40_000_000n,
        });
        return;
      }
      setTimeout(waitForWrite, 3000);
    }
    waitForWrite();
    setDepositHash(tx.hash);
  };

  const _sendEvents = () => {
    window.gtag("event", "deposit", {
      amount: parseFloat(amount.toString()),
    });
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
        {typeof depositHash === "undefined" ? (
          <div></div>
        ) : (
          <center>
            🚀 Finishied! Check your transaction on the explorer 🚀
            <a
              href={`https://arbiscan.io/tx/${depositHash}`}
              target="_blank"
            >{`https://arbiscan.io/tx/${depositHash}`}</a>
          </center>
        )}
      </div>
    </Modal>
  );

  return (
    <div>
      {contextHolder}
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
      <div style={{ color: "white" }}>Max Slippage: 2%</div>

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
          Please enter an amount greater than {MINIMUM_ZAP_IN_AMOUNT} and at
          most {MAXIMUM_ZAP_IN_AMOUNT}
        </div>
      )}
    </div>
  );
};

export default ZapInButton;
