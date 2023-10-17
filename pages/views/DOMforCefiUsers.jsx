import { Image, Table, Spin } from "antd";
import React, { useEffect, useState } from "react";
const PublicGoogleSheetsParser = require("public-google-sheets-parser");

const DOMforCefiUsers = ({ betterPoolsMetadata }) => {
  const [tokenPriceMapping, setTokenPriceMapping] = useState({});
  const [cefiLedger, setCefiLedger] = useState([]);
  const [
    rewardDifferenceBetweenClaimableAndNonSharable,
    setRewardDifferenceBetweenClaimableAndNonSharable,
  ] = useState(0);
  useEffect(() => {
    async function fetchTokenPirces() {
      let mapping = {};
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=equilibria-finance&vs_currencies=usd",
      )
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          mapping["eqb"] = data["equilibria-finance"]["usd"];
          mapping["xeqb"] = data["equilibria-finance"]["usd"];
        });
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=pendle&vs_currencies=usd",
      )
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          mapping["pendle"] = data["pendle"]["usd"];
        });
      setTokenPriceMapping(mapping);
    }
    async function fetchCefiLedger() {
      const spreadsheetId = "1m-zj3jHLaeo18hJp3cLjqaHOu0K6P-CQ9Mvd3otkjAg";
      const parser = new PublicGoogleSheetsParser(spreadsheetId);
      const data = await parser.parse(spreadsheetId);
      setCefiLedger(data);
    }
    fetchTokenPirces();
    fetchCefiLedger();
    const nonSharableRewards = cefiLedger.reduce((acc, row, _) => {
      return (
        acc +
        Object.entries(JSON.parse(row["Rewards"])).reduce(
          (subAcc, [key, amount]) => {
            return subAcc + amount * tokenPriceMapping[key];
          },
          0,
        )
      );
    }, 0);
    if (
      betterPoolsMetadata &&
      betterPoolsMetadata.categorized_positions &&
      betterPoolsMetadata.categorized_positions.long_term_bond
    ) {
      setRewardDifferenceBetweenClaimableAndNonSharable(
        betterPoolsMetadata.categorized_positions.long_term_bond
          .claimable_rewards - nonSharableRewards,
      );
    }
  }, [betterPoolsMetadata]);

  const dataSource = cefiLedger.map((row, idx) => ({
    key: idx,
    user: row["Depositor"],
    deposit: row["Deposit"],
    shares: row["Percentage"].toFixed(2),
    rewards: (
      (rewardDifferenceBetweenClaimableAndNonSharable * row["Percentage"]) /
        100 +
      Object.entries(JSON.parse(row["Rewards"])).reduce(
        (subAcc, [key, amount]) => {
          return subAcc + amount * tokenPriceMapping[key];
        },
        0,
      )
    ).toFixed(2),
  }));
  [
    {
      key: "1",
      token: <Image src="../tokenPictures/ETH.png" height={28} width={28} />,
      tvl:
        betterPoolsMetadata.categorized_positions.long_term_bond.sum !== 0 ? (
          "$" +
          betterPoolsMetadata.categorized_positions.long_term_bond.sum.toFixed(
            2,
          )
        ) : (
          <Spin size="small" />
        ),
      claimable_rewards:
        betterPoolsMetadata.categorized_positions.long_term_bond.sum !== 0 ? (
          "$" +
          betterPoolsMetadata.categorized_positions.long_term_bond.claimable_rewards.toFixed(
            2,
          )
        ) : (
          <Spin size="small" />
        ),
      apr: cefiLedger,
      roi: "?",
    },
    {
      key: "2",
      token: (
        <>
          <Image src="../tokenPictures/USDT.png" height={28} width={28} />
          <Image src="../tokenPictures/USDC.png" height={28} width={28} />
          <Image src="../tokenPictures/DAI.png" height={28} width={28} />
          <Image src="../tokenPictures/FRAX.png" height={28} width={28} />
        </>
      ),
      tvl:
        betterPoolsMetadata.categorized_positions.long_term_bond.sum !== 0 ? (
          "$" +
          betterPoolsMetadata.categorized_positions.intermediate_term_bond.sum.toFixed(
            2,
          )
        ) : (
          <Spin size="small" />
        ),
      claimable_rewards:
        betterPoolsMetadata.categorized_positions.long_term_bond.sum !== 0 ? (
          "$" +
          betterPoolsMetadata.categorized_positions.intermediate_term_bond.claimable_rewards.toFixed(
            2,
          )
        ) : (
          <Spin size="small" />
        ),
      apr: tokenPriceMapping,
      roi: "?",
    },
  ];

  const columns = [
    {
      title: "User",
      dataIndex: "user",
      key: "user",
    },
    {
      title: "Depost",
      dataIndex: "deposit",
      key: "deposit",
      render: (deposit) => deposit + " ETH",
    },
    {
      title: "Shares",
      dataIndex: "shares",
      key: "shares",
      render: (shares) => `${shares}%`,
    },
    {
      title: "Rewards",
      dataIndex: "rewards",
      key: "rewards",
      render: (rewards) => `$${rewards}`,
    },
  ];
  return <Table dataSource={dataSource} columns={columns} />;
};

export default DOMforCefiUsers;
