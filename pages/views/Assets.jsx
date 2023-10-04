import React, { useContext, useState, useEffect } from "react";
import { Space, Table, Tag, Image } from "antd";
import { web3Context } from "./Web3DataProvider";

const columns = [
  {
    title: "Chain",
    dataIndex: "chain",
    key: "chain",
    render: (chain) => (
      <Image
        src={
          chain === "fvm"
            ? `chainPictures/fvm.png`
            : `chainPictures/${chain}.svg`
        }
        alt={chain}
      />
    ),
  },
  {
    title: "Protocol",
    dataIndex: "protocol",
    key: "protocol",
    render: (protocol_logo_url) => (
      <Image src={protocol_logo_url} height={28} width={28} />
    ),
  },
  {
    title: "Asset",
    dataIndex: "asset",
    key: "asset",
  },
  {
    title: "Weight",
    dataIndex: "weight",
    key: "weight",
    render: (weight) => <>{weight}%</>,
  },
  {
    title: "Worth",
    dataIndex: "worth",
    key: "worth",
    render: (worth) => <>${worth.toFixed(2)}</>,
  },
  {
    title: "APR",
    dataIndex: "apr",
    key: "apr",
    render: (apr) => <>{(apr * 100).toFixed(2)}%</>,
  },
  {
    title: "Categories",
    key: "categories",
    dataIndex: "categories",
    render: (_, { categories }) => (
      <>
        {categories.map((tag, index) => {
          const colors = [
            "geekblue",
            "green",
            "volcano",
            "purple",
            "cyan",
            "magenta",
            "gold",
          ];
          const color = colors[index % colors.length]; // Cyclically assign colors
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          );
        })}
      </>
    ),
  },
];
const Assets = () => {
  const [aggregatedPostions, setAggregatedPositions] = useState([]);
  const WEB3_CONTEXT = useContext(web3Context);
  useEffect(() => {
    async function fetchAggregatedPositions() {
      if (WEB3_CONTEXT) {
        const netWorth = WEB3_CONTEXT.netWorth;
        setAggregatedPositions(
          WEB3_CONTEXT.aggregatedPositions === undefined
            ? 0
            : WEB3_CONTEXT.aggregatedPositions,
        );
        if (WEB3_CONTEXT.aggregatedPositions !== undefined) {
          const assetsData = Object.entries(WEB3_CONTEXT.aggregatedPositions)
            .map(([position, metadata], idx) => ({
              key: String(idx + 1),
              chain: metadata["tokens_metadata"][0].chain,
              protocol: metadata.protocol_logo_url,
              asset: position.split(":")[1],
              weight: ((metadata.worth / netWorth) * 100).toFixed(2),
              apr: metadata.APR,
              categories: metadata.metadata.categories,
              worth: metadata.worth, // Include the 'worth' property in the object
            }))
            .sort((a, b) => b.worth - a.worth);
          setAggregatedPositions(assetsData);
        } else {
          setAggregatedPositions([]);
        }
      }
    }
    fetchAggregatedPositions();
  }, [WEB3_CONTEXT]);
  return <Table columns={columns} dataSource={aggregatedPostions} />;
};
export default Assets;
