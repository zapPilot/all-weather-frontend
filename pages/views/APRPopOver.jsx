import React, { useState, useEffect, useContext } from "react";
import { Popover, Table, Tag } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { web3Context } from "./Web3DataProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const APRPopOver = ({ address, mode, portfolioApr }) => {
  const [claimableRewards, setClaimableRewards] = useState([]);
  const [aprComposition, setAprComposition] = useState({});
  const WEB3_CONTEXT = useContext(web3Context);

  useEffect(() => {
    async function fetchData() {
      try {
        // const hardcodedClaimableRewards = WEB3_CONTEXT.dataOfGetClaimableRewards;
        const hardcodedClaimableRewards = [
          {
            protocol: "SushSwap-DpxETH",
            claimableRewards: [
              {
                token: "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A",
                amount: "2",
              },
              {
                token: "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55",
                amount: "0.001",
              },
            ],
          },
          {
            protocol: "Equilibria-GLP",
            claimableRewards: [
              {
                token: "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
                amount: "2",
              },
              {
                token: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                amount: "0.0001",
              },
              {
                token: "0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C",
                amount: "1",
              },
            ],
          },
          {
            protocol: "Equilibria-GDAI",
            claimableRewards: [
              {
                token: "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
                amount: "6",
              },
              {
                token: "0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C",
                amount: "3",
              },
            ],
          },
          {
            protocol: "Equilibria-RETH",
            claimableRewards: [
              {
                token: "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
                amount: "10",
              },
              {
                token: "0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C",
                amount: "5",
              },
            ],
          },
        ];
        setClaimableRewards(hardcodedClaimableRewards);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    async function fetchAprComposition() {
      fetch(`${API_URL}/apr_composition`)
        .then((response) => response.json())
        .then((result) => setAprComposition(result))
        .catch((error) => console.error("Error of apr_composition:", error));
    }
    fetchData();
    fetchAprComposition();
  }, []);

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
    if (!WEB3_CONTEXT) return [];
    const turnReward2Price = (claimableReward) =>
      parseFloat(
        claimableReward.amount *
          WEB3_CONTEXT["debankContext"][claimableReward.token.toLowerCase()]
            .price,
      );

    return claimableRewards
      .map((reward) =>
        reward.claimableRewards.map((claimableReward) => ({
          pool: reward.protocol,
          token:
            WEB3_CONTEXT["debankContext"][claimableReward.token.toLowerCase()],
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
      title: "Value",
      dataIndex: "value",
      key: "value",
      width: 24,
      render: (price) => <Tag key={price}>${price.toFixed(2)}</Tag>,
    },
  ];

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
        <h2 className="ant-table-title">Claimable Rewards:</h2>
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
