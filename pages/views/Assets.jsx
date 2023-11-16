import React, { useContext, useState, useEffect } from "react";
import { Table, Tag, Image } from "antd";
import { web3Context } from "./Web3DataProvider";

const hardcodedShowCases = [
  {
    chain: "base",
    protocol:
      "https://static.debank.com/image/arb_token/logo_url/0xa9f5606c3e6aab998fd4f4bc54a18d9fe13a0dd8/c103792e3507fc4210e2fa59404410f2.png",
    asset: "VLP",
    weight: 0,
    apr: 0.2474,
    categories: ["intermediate_term_bond"],
    worth: 0,
  },
  {
    chain: "linea",
    protocol: "https://icons.llamao.fi/icons/protocols/velocore?w=48&h=48",
    asset: "USDT",
    weight: 0,
    apr: 0.7296,
    categories: ["intermediate_term_bond"],
    worth: 0,
  },
  {
    chain: "zksync",
    protocol:
      "https://static.debank.com/image/era_token/logo_url/0x3a287a06c66f9e95a56327185ca2bdf5f031cecd/9003539eb61139bd494b7412b785d482.png",
    asset: "USDT-USDC",
    weight: 0,
    apr: 0.4589,
    categories: ["intermediate_term_bond"],
    worth: 0,
  },
];

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
        height={24}
        width={24}
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
  const [aggregatedPositions, setAggregatedPositions] = useState([]);
  const WEB3_CONTEXT = useContext(web3Context);
  useEffect(() => {
    async function fetchAggregatedPositions() {
      if (WEB3_CONTEXT) {
        const netWorth = WEB3_CONTEXT.netWorth;
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
  return (
    <>
      <h2>Current Vaults</h2>
      <Table columns={columns} dataSource={aggregatedPositions} />
      <h2>Historical Vaults</h2>
      <Table columns={columns} dataSource={hardcodedShowCases} />
    </>
  );
};
export default Assets;
