import { Input, Button, Space, Select } from "antd";
import {
  fetch1InchSwapData,
  getPendleZapInData,
  getPendleZapOutData,
  wethAddress,
  dpxTokenAddress,
  dpxVault,
  equilibriaGDAIVault,
  equilibriaRETHVault,
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
import { DollarOutlined } from "@ant-design/icons";
import { useEffect, useState, useContext } from "react";
import { web3Context } from "./Web3DataProvider";
const { Option } = Select;
const { ethers } = require("ethers");

const ZapInButton = ({ address }) => {
  const [signer, setSigner] = useState(null);
  const [permanentPortfolio, setPermanentPortfolio] = useState(null);
  const WEB3_CONTEXT = useContext(web3Context);
  const [oneInchSwapDataForDpx, setOneInchSwapDataForDpx] = useState("");
  const [oneInchSwapDataForGDAI, setOneInchSwapDataForGDAI] = useState("");
  const [oneInchSwapDataForRETH, setOneInchSwapDataForRETH] = useState("");

  useEffect(() => {
    if (WEB3_CONTEXT) {
      const oneInchSwapDataForDpx = fetch1InchSwapData(
        42161,
        wethAddress,
        dpxTokenAddress,
        ethers.utils.parseEther("10"),
        dpxVaultAddress,
        50,
      );
      const oneInchSwapDataForGDAI = fetch1InchSwapData(
        42161,
        wethAddress,
        daiAddress,
        ethers.utils.parseEther("10"),
        equilibriaGDAIVaultAddress,
        50,
      );
      const oneInchSwapDataForRETH = fetch1InchSwapData(
        42161,
        wethAddress,
        rethTokenAddress,
        ethers.utils.parseEther("10"),
        equilibriaRETHVaultAddress,
        50,
      );
      // pendleGDAIZapInData = getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.utils.parseEther(etherAmount.toString())(100), 0.2, daiAddress);
      // pendleGLPZapInData = getPendleZapInData(42161, glpMarketPoolAddress, ethers.utils.parseEther(etherAmount.toString())(4), 0.99);
      // pendleRETHZapInData = getPendleZapInData(42161, rethMarketPoolAddress, ethers.utils.parseEther(etherAmount.toString())(100), 0.2, rethTokenAddress);
    }
  }, []);
  const handleInputChange = async (e) => {
    const oneInchSwapDataForDpx = await fetch1InchSwapData(
      42161,
      wethAddress,
      dpxTokenAddress,
      ethers.utils.parseEther(e.target.value),
      dpxVaultAddress,
      50,
    );
    setOneInchSwapDataForDpx(oneInchSwapDataForDpx.tx.data);

    const oneInchSwapDataForGDAI = await fetch1InchSwapData(
      42161,
      wethAddress,
      daiAddress,
      ethers.utils.parseEther(e.target.value),
      equilibriaGDAIVaultAddress,
      50,
    );
    setOneInchSwapDataForDpx(oneInchSwapDataForGDAI.tx.data);

    const oneInchSwapDataForRETH = await fetch1InchSwapData(
      42161,
      wethAddress,
      rethTokenAddress,
      ethers.utils.parseEther(e.target.value),
      equilibriaRETHVaultAddress,
      50,
    );
    setOneInchSwapDataForDpx(oneInchSwapDataForRETH.tx.data);
    // pendleGDAIZapInData = getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.utils.parseEther(etherAmount.toString())(100), 0.2, daiAddress);
    // pendleGLPZapInData = getPendleZapInData(42161, glpMarketPoolAddress, ethers.utils.parseEther(etherAmount.toString())(4), 0.99);
    // pendleRETHZapInData = getPendleZapInData(42161, rethMarketPoolAddress, ethers.utils.parseEther(etherAmount.toString())(100), 0.2, rethTokenAddress);
  };
  const handleZapIn = async () => {
    // Define any parameters required by the deposit function
    console.log(
      "1inch data:",
      oneInchSwapDataForDpx,
      oneInchSwapDataForGDAI,
      oneInchSwapDataForRETH,
    );
    const tx = await WEB3_CONTEXT.portfolioContract.deposit();
    console.log("Transaction sent:", tx.hash);

    // Wait for the transaction to be confirmed
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);
  };
  const selectBefore = (
    <Select
      defaultValue="ETH"
      theme="light"
      style={{ backgroundColor: "white" }}
    >
      <Option value="ETH">ETH</Option>
    </Select>
  );

  return (
    <div>
      <Space.Compact style={{ width: "70%" }}>
        <Input
          addonBefore={selectBefore}
          defaultValue=""
          onChange={handleInputChange}
        />
        <Button type="primary">Max</Button>
      </Space.Compact>
      <Button
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
        Deposit
      </Button>
    </div>
  );
};

export default ZapInButton;
