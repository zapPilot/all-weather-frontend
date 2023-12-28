import { Image, Table, Spin } from "antd";
import React from "react";
const DOMforCefi = ({ betterPoolsMetadata }) => {
  let longTermBondsAPR = _calAverageAPR(betterPoolsMetadata, "long_term_bond");
  let intermediateBondsAPR = _calAverageAPR(
    betterPoolsMetadata,
    "intermediate_term_bond",
  );

  const dataSource = [
    {
      key: "1",
      token: (
        <Image
          src="../tokenPictures/ETH.png"
          height={28}
          width={28}
          alt="ETH-token"
        />
      ),
      tvlUsd: betterPoolsMetadata ? (
        "$" +
        betterPoolsMetadata.categorized_positions.long_term_bond.sum.toFixed(2)
      ) : (
        <Spin size="small" />
      ),
      claimable_rewards: betterPoolsMetadata ? (
        "$" +
        betterPoolsMetadata.categorized_positions.long_term_bond.claimable_rewards.toFixed(
          2,
        )
      ) : (
        <Spin size="small" />
      ),
      apr: `${longTermBondsAPR}%`,
      roi: "?",
    },
    {
      key: "2",
      token: (
        <>
          <Image
            src="../tokenPictures/USDT.png"
            height={28}
            width={28}
            alt="USDT-token"
          />
          <Image
            src="../tokenPictures/USDC.png"
            height={28}
            width={28}
            alt="USDC-token"
          />
          <Image
            src="../tokenPictures/DAI.png"
            height={28}
            width={28}
            alt="DAI-token"
          />
          <Image
            src="../tokenPictures/FRAX.png"
            height={28}
            width={28}
            alt="FRAX-token"
          />
        </>
      ),
      tvlUsd: betterPoolsMetadata ? (
        "$" +
        betterPoolsMetadata.categorized_positions.intermediate_term_bond.sum.toFixed(
          2,
        )
      ) : (
        <Spin size="small" />
      ),
      claimable_rewards: betterPoolsMetadata ? (
        "$" +
        betterPoolsMetadata.categorized_positions.intermediate_term_bond.claimable_rewards.toFixed(
          2,
        )
      ) : (
        <Spin size="small" />
      ),
      apr: `${intermediateBondsAPR}%`,
      roi: "?",
    },
  ];

  const columns = [
    {
      title: "Token",
      dataIndex: "token",
      key: "token",
    },
    {
      title: "TVL",
      dataIndex: "tvlUsd",
      key: "tvlUsd",
    },
    {
      title: "Total Claimable Rewards",
      dataIndex: "claimable_rewards",
      key: "claimable_rewards",
    },
    {
      title: "APR",
      dataIndex: "apr",
      key: "apr",
    },
    {
      title: "ROI",
      dataIndex: "roi",
      key: "roi",
    },
  ];
  return <Table dataSource={dataSource} columns={columns} pagination={false} />;
};

const _calAverageAPR = (betterPoolsMetadata, key) => {
  let longTermBondsAPR = 0;
  if (
    betterPoolsMetadata &&
    betterPoolsMetadata.categorized_positions &&
    betterPoolsMetadata.categorized_positions.long_term_bond &&
    betterPoolsMetadata.categorized_positions[key].sum !== 0
  ) {
    for (const position of Object.values(
      betterPoolsMetadata.categorized_positions[key].portfolio,
    )) {
      longTermBondsAPR += position.APR * 100;
    }
    longTermBondsAPR = (
      longTermBondsAPR /
      Object.values(betterPoolsMetadata.categorized_positions[key].portfolio)
        .length
    ).toFixed(2);
  }
  return longTermBondsAPR;
};

export default DOMforCefi;
