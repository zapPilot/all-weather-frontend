import { Input, Button, Space, Select } from "antd";
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
import { DollarOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useContractWrite, useAccount } from "wagmi";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";

const { Option } = Select;
const { ethers } = require("ethers");

const ZapInButton = () => {
  const { address } = useAccount();
  const normalWording = "Deposit";
  const loadingWording = "Fetching the best route to deposit (23s)";
  const [amount, setAmount] = useState(0);
  const [oneInchSwapDataForDpx, setOneInchSwapDataForDpx] = useState("");
  const [oneInchSwapDataForGDAI, setOneInchSwapDataForGDAI] = useState("");
  const [oneInchSwapDataForRETH, setOneInchSwapDataForRETH] = useState("");
  const [pendleGDAIZapInData, setPendleGDAIZapInData] = useState("");
  const [pendleGLPZapInData, setPendleGLPZapInData] = useState("");
  const [pendleRETHZapInData, setPendleRETHZapInData] = useState("");
  const [apiDataReady, setApiDataReady] = useState(true);
  const { write } = useContractWrite({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "deposit",
  });

  useEffect(() => {}, []);
  const handleInputChange = async (e) => {
    setApiDataReady(false);
    const amount_ = ethers.utils.parseEther(e.target.value);
    setAmount(amount_);

    const [
      oneInchSwapDataForDpx,
      oneInchSwapDataForGDAI,
      oneInchSwapDataForRETH,
      pendleGDAIZapInData,
      pendleGLPZapInData,
      pendleRETHZapInData,
    ] = await Promise.all([
      fetch1InchSwapData(
        42161,
        wethAddress,
        dpxTokenAddress,
        amount_,
        dpxVaultAddress,
        50,
      ),
      fetch1InchSwapData(
        42161,
        wethAddress,
        daiAddress,
        amount_,
        equilibriaGDAIVaultAddress,
        50,
      ),
      fetch1InchSwapData(
        42161,
        wethAddress,
        rethTokenAddress,
        amount_,
        equilibriaRETHVaultAddress,
        50,
      ),
      getPendleZapInData(
        42161,
        gDAIMarketPoolAddress,
        ethers.BigNumber.from("4169610544157379271081"),
        0.2,
        daiAddress,
      ),
      getPendleZapInData(
        42161,
        glpMarketPoolAddress,
        amount_,
        0.2,
        wethAddress,
      ),
      getPendleZapInData(
        42161,
        rethMarketPoolAddress,
        amount_,
        0.2,
        rethTokenAddress,
      ),
    ]);

    setOneInchSwapDataForDpx(oneInchSwapDataForDpx.tx.data);
    setOneInchSwapDataForGDAI(oneInchSwapDataForGDAI.tx.data);
    setOneInchSwapDataForRETH(oneInchSwapDataForRETH.tx.data);
    setPendleGDAIZapInData(pendleGDAIZapInData);
    setPendleGLPZapInData(pendleGLPZapInData);
    setPendleRETHZapInData(pendleRETHZapInData);
    setApiDataReady(true);
  };

  const handleZapIn = async () => {
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
    const depositData = {
      amount,
      receiver: address,
      oneInchDataDpx: oneInchSwapDataForDpx,
      glpMinLpOut: ethers.BigNumber.from(pendleGLPZapInData[2]),
      glpGuessPtReceivedFromSy: pendleGLPZapInData[3],
      glpInput: pendleGLPZapInData[4],
      gdaiMinLpOut: ethers.BigNumber.from(pendleGDAIZapInData[2]),
      gdaiGuessPtReceivedFromSy: pendleGDAIZapInData[3],
      gdaiInput: pendleGDAIZapInData[4],
      gdaiOneInchDataGDAI: oneInchSwapDataForGDAI,
      rethMinLpOut: ethers.BigNumber.from(pendleRETHZapInData[2]),
      rethGuessPtReceivedFromSy: pendleRETHZapInData[3],
      rethInput: pendleRETHZapInData[4],
      rethOneInchDataRETH: oneInchSwapDataForRETH,
    };
    write({
      args: [depositData],
      from: address,
    });
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
        {apiDataReady ? normalWording : loadingWording}
      </Button>
    </div>
  );
};

export default ZapInButton;
