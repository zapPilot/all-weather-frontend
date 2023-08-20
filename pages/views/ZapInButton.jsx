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
  const [pendleGDAIZapInData, setPendleGDAIZapInData] = useState("");
  const [pendleGLPZapInData, setPendleGLPZapInData] = useState("");
  const [pendleRETHZapInData, setPendleRETHZapInData] = useState("");

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
    setOneInchSwapDataForGDAI(oneInchSwapDataForGDAI.tx.data);

    const oneInchSwapDataForRETH = await fetch1InchSwapData(
      42161,
      wethAddress,
      rethTokenAddress,
      ethers.utils.parseEther(e.target.value),
      equilibriaRETHVaultAddress,
      50,
    );
    setOneInchSwapDataForRETH(oneInchSwapDataForRETH.tx.data);

    const pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from("4169610544157379271081"), 0.2, daiAddress);
    setPendleGDAIZapInData(pendleGDAIZapInData);

    const pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, ethers.utils.parseEther("10"), 0.2, wethAddress);
    setPendleGLPZapInData(pendleGLPZapInData);

    const pendleRETHZapInData = await getPendleZapInData(42161, rethMarketPoolAddress, ethers.utils.parseEther("10"), 0.2, rethTokenAddress);
    setPendleRETHZapInData(pendleRETHZapInData);
  };
  const handleZapIn = async () => {
    // Define any parameters required by the deposit function
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
