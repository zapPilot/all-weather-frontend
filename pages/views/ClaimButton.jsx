import { Button, message } from "antd";
import {
  fetch1InchSwapData,
  portfolioContractAddress,
  USDT,
  APX,
} from "../../utils/oneInch";
import { DollarOutlined } from "@ant-design/icons";
import { useContractWrite, useAccount } from "wagmi";
import { useState, useContext, useEffect } from "react";
import { web3Context } from "./Web3DataProvider";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";
import { sendDiscordMessage } from "../../utils/discord";
import { waitForWrite } from "../../utils/contractInteractions";
import TokenDropdown from "./components/TokenDropdowns.jsx";

const ClaimButton = () => {
  const { address } = useAccount();
  const [messageApi, contextHolder] = message.useMessage();
  const [aggregatorDataReady, setAggregatorDataReady] = useState(true);
  const WEB3_CONTEXT = useContext(web3Context);
  const [claimableRewards, setClaimableRewards] = useState(0);

  const normalWording = "Claim and Swap to";
  const loadingWording = "Fetching the best route to dump these rewards...";
  const useDump = true;

  useEffect(() => {
    async function fetchData() {
      const claimableRewards = WEB3_CONTEXT.dataOfGetClaimableRewards;
      if (claimableRewards === undefined) return;
      setClaimableRewards(claimableRewards[0].claimableRewards[0].amount);
    }
    fetchData();
  }, [WEB3_CONTEXT]);

  const { write } = useContractWrite({
    address: portfolioContractAddress,
    abi: permanentPortfolioJson.abi,
    functionName: "claim",
    onError(error) {
      messageApi.error({
        content: error.shortMessage,
        duration: 5,
      });
    },
    onSuccess(data) {
      sendDiscordMessage(`${address} successfully claimed!`);
      messageApi.info(
        `Successfully claimed! https://bscscan.com/tx/${data.hash}`,
      );
    },
  });

  const handleClaim = async () => {
    await sendDiscordMessage(`${address} starts claim()`);
    await _sendDepositTransaction();
  };
  const _sendDepositTransaction = async () => {
    setAggregatorDataReady(false);
    const aggregatorDatas = await _getAggregatorData(
      claimableRewards,
      portfolioContractAddress,
      APX,
      USDT,
    );
    setAggregatorDataReady(true);
    const claimData = _getClaimData(useDump, aggregatorDatas);
    waitForWrite(write, claimData, address);
  };

  const _getAggregatorData = async (
    amount,
    fromAddress,
    rewardAddress,
    tokenOutAddress,
  ) => {
    const [apolloxAggregatorData] = await Promise.all([
      fetch1InchSwapData(
        56,
        rewardAddress,
        tokenOutAddress,
        amount,
        fromAddress,
        1,
      ),
    ]);
    return {
      apolloxAggregatorData,
    };
  };

  const _getClaimData = (useDump, aggregatorDatas) => {
    return [
      {
        receiver: address,
        apolloXClaimData: {
          tokenOut: USDT,
          aggregatorData: aggregatorDatas.apolloxAggregatorData.tx.data,
        },
      },
      useDump,
    ];
  };
  return (
    <div>
      {contextHolder}
      <Button
        loading={!aggregatorDataReady}
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
        onClick={() => handleClaim()}
      >
        {aggregatorDataReady ? normalWording : loadingWording}
      </Button>
      <TokenDropdown handleChange={(value)=>{console.log(`change ${value}`)}}/>
    </div>
  );
};

export default ClaimButton;
