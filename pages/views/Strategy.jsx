import React from "react";
import { useContext, useState, useEffect } from "react";
import { web3Context } from "./Web3DataProvider";
import { ConfigProvider, Image, Button } from "antd";
import RebalanceChart from "./RebalanceChart";
import { useWindowWidth } from "../../utils/chartUtils";
import TokenTable from "./components/TokenTable.jsx";

const columns = [
  {
    title: "Category",
    dataIndex: "category",
    key: "category",
    render: (text) => <span style={{ color: "#ffffff" }}>{text}</span>,
  },
  {
    title: "Target Weight",
    dataIndex: "weight",
    key: "weight",
    render: (weight) => {
      if (weight !== 0) {
        return <span style={{ color: "#ffffff" }}>{weight}%</span>;
      }
    },
  },
  {
    title: "Explanation",
    dataIndex: "explanation",
    key: "explanation",
    render: (explanation) => (
      <span style={{ color: "#ffffff" }}>{explanation}</span>
    ),
  },
  {
    title: "Examples",
    key: "examples",
    dataIndex: "examples",
    render: (_, { examples }) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto auto",
        }}
      >
        {examples.map((tokenSymbol, index) => {
          return (
            <span key={index}>
              <Image
                src={`tokenPictures/${tokenSymbol}.png`}
                height={20}
                width={20}
                alt={`${tokenSymbol}-token`}
              />
            </span>
          );
        })}
      </div>
    ),
  },
];
const data = [
  {
    key: "1",
    category: "Tokenomics",
    weight: 0,
    examples: [],
    explanation: (
      <ConfigProvider
        theme={{
          token: {
            colorLink: "#5DFDCB",
          },
        }}
      >
        <Button
          type="link"
          href="https://all-weather.gitbook.io/all-weather-protocol/investment-strategy/how-do-we-pick-cryptos"
          target="_blank"
        >
          Check GitBook for more Details
        </Button>
      </ConfigProvider>
    ),
  },
  {
    key: "2",
    category: "Long Term Bond",
    weight: 40,
    examples: ["ETH"],
    explanation: "ETH. It's just like US bond, too big to fall.",
  },
  {
    key: "3",
    category: "Intermediate Term Bond",
    weight: 15,
    explanation:
      "OHM, USDT/USDC/DAI/FRAX. OHM is decentralized reserve currency, backed by diversified assets. It works like our FED, which make it similar to bond. About stable coin, short term speaking it's still trustworthy. But would lower its propotion as time goes by. OHM is a decentralized reserve currency, underpinned by a diverse array of assets, functioning similarly to a federal reserve or bond. As for stablecoins, they remain reliable in the short term. However, their allocation will be gradually reduced over time",
    examples: ["OHM", "USDT", "USDC", "DAI", "FRAX"],
  },
  {
    key: "4",
    category: "Gold",
    weight: 7.5,
    explanation:
      "GLP. It serves as a liquidity token that enables you to act as a banker in a perpetual exchange. The performance of these exchanges has been notably strong during bear markets. In some respects, GLP functions similarly to gold, offering a hedge against portfolio volatility when the majority of your tokens are declining.",
    examples: ["GLP"],
  },
  {
    key: "5",
    category: "Commodities",
    weight: 7.5,
    explanation:
      "BNB, OP. Only native chain tokens or governance tokens fall under this category.",
    examples: ["BNB", "OP"],
  },
  {
    key: "6",
    category: "Large Cap US Stocks",
    weight: 18,
    explanation:
      "Radiant and Pendle. This category includes tokens in the DeFi space (DEX, Lending, CDP, etc.) that rank within the top 300 on CoinGecko.",
    examples: ["RDNT", "PENDLE"],
  },
  {
    key: "7",
    category: "Small Cap US Stocks",
    weight: 3,
    explanation:
      "Velodrome and Lyra. This category includes tokens similar to the previous category but that rank outside the top 300 on CoinGecko.",
    examples: ["VELO", "LYRA"],
  },
  {
    key: "8",
    category: "Non US Developed Market Stocks",
    weight: 6,
    explanation:
      "This category encompasses some well-known tokens that are not part of the DeFi space, such as FIL, LINK, and GRT, which belong to the storage, oracle, and indexing infrastructure sectors, respectively.",
    examples: ["FIL", "LINK", "GRT"],
  },
  {
    key: "9",
    category: "Non US Emerging Market Stocks",
    weight: 3,
    explanation:
      "This category includes tokens that are similar to those in the previous category but are focused on cutting-edge technologies. Examples include SSV, which is related to Distributed Validator Technology (DVT); tokens associated with ETH storage in the storage space; Celestia, which belongs to the modularization space; and CyberConnect, which belongs to the decentralized social network space.",
    examples: ["SSV", "TIA"],
  },
];
const Strategy = () => {
  const windowWidth = useWindowWidth();
  const WEB3_CONTEXT = useContext(web3Context);
  const [netWorth, setNetWorth] = useState(0);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState([]);
  useEffect(() => {
    async function fetchPortfolioMetadata() {
      if (WEB3_CONTEXT !== undefined) {
        setNetWorth(WEB3_CONTEXT.netWorth);
        setRebalanceSuggestions(WEB3_CONTEXT.rebalanceSuggestions);
      }
    }
    fetchPortfolioMetadata();
  }, [WEB3_CONTEXT]);
  return (
    <>
      <TokenTable columns={columns} dataSource={data} />
      <p>
        Explanation: There are two layers in this pie chart because of the
        mapping from assets to categories. Please note that each asset may
        belong to multiple categories.
      </p>
      <RebalanceChart
        rebalanceSuggestions={rebalanceSuggestions}
        netWorth={netWorth}
        windowWidth={windowWidth}
        showCategory={true}
      />
    </>
  );
};
export default Strategy;
