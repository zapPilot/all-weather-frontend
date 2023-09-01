import React, { useState, useEffect, useContext } from "react";
import { Popover, Table, Tag } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { web3Context } from "./Web3DataProvider";
import ClaimButton from "./ClaimButton";
import { ethers } from "ethers";
const BigNumber = require("bignumber.js");

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const APRPopOver = ({ address, mode, portfolioApr }) => {
  const [claimableRewards, setClaimableRewards] = useState([]);
  const [aprComposition, setAprComposition] = useState({});
  const [sumOfRewardsDenominatedInUSD, setSumOfRewardsDenominatedInUSD] =
    useState(0);
  const WEB3_CONTEXT = useContext(web3Context);

  useEffect(() => {
    async function fetchData() {
      const claimableRewards = WEB3_CONTEXT.dataOfGetClaimableRewards;
      const claimableRewardsWithChainInfo =
        addChainInfoToToken(claimableRewards);
      setClaimableRewards(claimableRewardsWithChainInfo);
      if (claimableRewardsWithChainInfo === undefined) return;
      const sumOfRewardsDenominatedInUSD_ =
        claimableRewardsWithChainInfo.reduce((total, reward) => {
          return (
            total +
            reward.claimableRewards.reduce((innerTotal, claimableReward) => {
              return innerTotal + turnReward2Price(claimableReward);
            }, 0)
          );
        }, 0);
      setSumOfRewardsDenominatedInUSD(sumOfRewardsDenominatedInUSD_);
    }

    function addChainInfoToToken(claimableRewards) {
      if (claimableRewards === undefined) return;
      for (const reward of claimableRewards) {
        for (const claimableReward of reward.claimableRewards) {
          if (!claimableReward.token.startsWith("arb")) {
            claimableReward.token = `arb:${claimableReward.token}`;
          }
        }
      }
      return claimableRewards;
    }

    async function fetchAprComposition() {
      fetch(`${API_URL}/apr_composition`)
        .then((response) => response.json())
        .then((result) => setAprComposition(result))
        .catch((error) => console.error("Error of apr_composition:", error));
    }
    if (!WEB3_CONTEXT) return;
    fetchData();
    fetchAprComposition();
  }, [WEB3_CONTEXT]);

  function renderContent() {
    if (!WEB3_CONTEXT || !aprComposition) return <div>Loading...</div>;

    return (
      <ul>
        {Object.keys(aprComposition).map((protocol, index) => (
          <li key={index}>
            - {protocol}
            <ul>
              {Object.keys(aprComposition[protocol]).map((rewardKey, idx) => {
                return (
                  <RewardItem
                    key={`${protocol}-${rewardKey}-${idx}`}
                    protocol={protocol}
                    rewardKey={rewardKey}
                    value={aprComposition[protocol][rewardKey]}
                  />
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    );
  }

  const RewardItem = ({ protocol, rewardKey, value }) => {
    const renderImageAndAPR = (tokenAddr) => (
      <>
        <img
          src={WEB3_CONTEXT["debankContext"][tokenAddr].img}
          width="20"
          height="20"
          alt={rewardKey}
        />
        {WEB3_CONTEXT["debankContext"][tokenAddr].symbol}:{" "}
        {(value["APR"] * 100).toFixed(2)}%
      </>
    );

    const renderToken = () => {
      for (const tokenAddr of value["token"]) {
        if (WEB3_CONTEXT["debankContext"].hasOwnProperty(tokenAddr)) {
          return renderImageAndAPR(tokenAddr);
        }
      }
    };

    const renderReward = () => {
      if (rewardKey === "Underlying APY") {
        return renderToken();
      } else if (rewardKey === "Swap Fee") {
        return (
          <>
            <img
              src="https://icons-for-free.com/iconfiles/png/512/currency+dollar+money+icon-1320085755803367648.png"
              width="20"
              height="20"
              alt={rewardKey}
            />
            {`${rewardKey}: ${(value["APR"] * 100).toFixed(2)}%`}
          </>
        );
      } else if (WEB3_CONTEXT["debankContext"].hasOwnProperty(value["token"])) {
        return renderImageAndAPR(value["token"]);
      }
    };

    return <li key={`${protocol}-${rewardKey}`}>{renderReward()}</li>;
  };

  function calculateClaimableRewards() {
    if (!WEB3_CONTEXT || claimableRewards === undefined) return [];

    return claimableRewards
      .map((reward) =>
        reward.claimableRewards.map((claimableReward) => ({
          pool: reward.protocol,
          token:
            WEB3_CONTEXT["debankContext"][claimableReward.token.toLowerCase()],
          amount: ethers.utils.formatEther(claimableReward.amount),
          value: turnReward2Price(claimableReward),
        })),
      )
      .flat();
  }

  const getColumnsForSuggestionsTable = [
    {
      title: "Pool",
      dataIndex: "pool",
      key: "pool",
      width: 24,
    },
    {
      title: "Token",
      dataIndex: "token",
      key: "token",
      width: 24,
      render: (tokenInfo) => (
        <div>
          <img
            src={tokenInfo.img}
            width="20"
            height="20"
            alt={tokenInfo.symbol}
          />
          {tokenInfo.symbol}
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 24,
      render: (amount) => <Tag key={amount}>{amount}</Tag>,
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      width: 24,
      render: (price) => <Tag key={price}>${price.toFixed(2)}</Tag>,
    },
  ];
  const turnReward2Price = (claimableReward) => {
    const priceAsFloat =
      WEB3_CONTEXT["debankContext"][claimableReward.token.toLowerCase()].price;

    // Use BigNumber from 'bignumber.js' to multiply the price by 10^18
    const priceBigNumber = new BigNumber(priceAsFloat).times(
      new BigNumber(10).pow(18),
    );
    // Convert the result to a string
    const priceAsString = priceBigNumber.toFixed();

    // Convert to an ethers BigNumber
    const priceInBigNumber = ethers.BigNumber.from(priceAsString);

    // Multiply price with amount (both as ethers BigNumbers)
    const resultInBigNumber = priceInBigNumber.mul(claimableReward.amount);
    // Divide by 10^18 to get the final result
    const finalResult = ethers.utils.formatEther(resultInBigNumber);
    if (finalResult > 0) {
      return parseFloat(
        new BigNumber(Math.floor(finalResult)).div(
          BigInt("1000000000000000000"),
        ),
      );
    }
    return 0;
  };

  if (mode === "percentage") {
    return (
      <Popover
        style={{ width: 500 }}
        content={renderContent()}
        title="Projected APR"
        trigger="hover"
      >
        <InfoCircleOutlined />
      </Popover>
    );
  } else {
    return (
      <div>
        <h2 className="ant-table-title">
          Claimable Rewards: ${sumOfRewardsDenominatedInUSD.toFixed(2)}
        </h2>
        <ClaimButton />
        <Table
          columns={getColumnsForSuggestionsTable}
          dataSource={calculateClaimableRewards()}
          pagination={false}
        />
      </div>
    );
  }
};

export default APRPopOver;
