//@ts-nocheck
// All code in this file will be ignored by the TypeScript compiler
import { Button, message, Space } from "antd";
import {
  fetch1InchSwapData,
  portfolioContractAddress,
  APX,
} from "../../utils/oneInch";
import { DollarOutlined } from "@ant-design/icons";
import { useAddress } from "@thirdweb-dev/react";

import { useState, useContext, useEffect } from "react";
import { useContractWrite } from "@thirdweb-dev/react";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json";
import { sendDiscordMessage } from "../../utils/discord";
import TokenDropdown from "./components/TokenDropdowns.jsx";

const ClaimButton = () => {
  const address = useAddress();
  const [messageApi, contextHolder] = message.useMessage();
  const [aggregatorDataReady, setAggregatorDataReady] = useState(true);
  const [claimableRewards, setClaimableRewards] = useState(0);
  const [chosenToken, setChosenToken] = useState(
    "0x55d398326f99059fF775485246999027B3197955",
  );

  const normalWording = "Claim and Swap to";
  const loadingWording = "Fetching the best route to dump these rewards...";
  const useDump = true;

  const { data, writeContract, status } = useContractWrite();
  // Mocked data
  const WEB3_CONTEXT = {"dataOfGetClaimableRewards": [{"claimableRewards": [{"amount": 0}]}]};
  useEffect(() => {
    async function fetchData() {
      const claimableRewards = WEB3_CONTEXT.dataOfGetClaimableRewards;
      if (claimableRewards === undefined) return;
      setClaimableRewards(claimableRewards[0].claimableRewards[0].amount);
      if (status === "success") {
        messageApi.open({
          type: "success",
          content: `Successfully claimed! https://bscscan.com/tx/${data.hash}`,
        });
      }
    }
    fetchData();
  }, [WEB3_CONTEXT, status]);

  const handleClaim = async () => {
    await sendDiscordMessage(address, "starts claim()");
    await _sendDepositTransaction();
  };
  const _sendDepositTransaction = async () => {
    setAggregatorDataReady(false);
    const aggregatorDatas = await _getAggregatorData(
      claimableRewards,
      portfolioContractAddress,
      APX,
      chosenToken,
    );
    setAggregatorDataReady(true);
    const claimData = _getClaimData(useDump, aggregatorDatas);
    writeContract(
      {
        address: portfolioContractAddress,
        abi: permanentPortfolioJson.abi,
        functionName: "claim",
        args: claimData,
        from: address,
      },
      {
        onError(error) {
          messageApi.error({
            content: error.shortMessage,
            duration: 5,
          });
        },
        onSuccess(data) {
          sendDiscordMessage(address, "successfully claimed!");
        },
      },
    );
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
          tokenOut: chosenToken,
          aggregatorData: aggregatorDatas.apolloxAggregatorData.tx.data,
        },
      },
      useDump,
    ];
  };
  return (
    <div>
      {contextHolder}
      <Space.Compact
        style={{
          margin: "10px 0",
        }}
      >
        <Button
          loading={!aggregatorDataReady}
          type="primary"
          icon={<DollarOutlined />}
          onClick={() => handleClaim()}
        >
          {aggregatorDataReady ? normalWording : loadingWording}
        </Button>
        <TokenDropdown
          handleChange={(value) => {
            setChosenToken(value);
          }}
        />
      </Space.Compact>
    </div>
  );
};

export default ClaimButton;
