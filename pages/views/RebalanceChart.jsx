// Copyright (c) 2016 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
import React, { useState, useEffect, useCallback } from "react";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";

import { Sunburst, LabelSeries } from "react-vis";
import { EXTENDED_DISCRETE_COLOR_RANGE } from "react-vis/dist/theme";
import { Spin } from "antd";
import { useSelector } from "react-redux";
import { useActiveAccount } from "thirdweb/react";
import Link from "next/link";
import { Typography, message } from "antd";
import { CopyIcon } from "../../utils/icons.jsx";
import ConfiguredConnectButton from "../ConnectButton";
const { Title, Paragraph, Text } = Typography;

const DefaultValue = {
  children: [
    {
      name: "Loading...",
      hex: "#12939A",
      children: [{ name: "Loading...", hex: "#12939A", value: 100 }],
    },
  ],
};
const CategoryTranslation = {
  long_term_bond: "ETH",
  intermediate_term_bond: "Zero-Coupon Bond",
  commodities: "Non Financial App",
  gold: "Stablecoins",
  large_cap_us_stocks: "Large Market Cap",
  small_cap_us_stocks: "Small Market Cap",
  non_us_developed_market_stocks: "Non EVM Large Market Cap",
  non_us_emerging_market_stocks: "Non EVM Small Market Cap",
};
/**
 * Recursively work backwards from highlighted node to find path of valud nodes
 * @param {Object} node - the current node being considered
 * @returns {Array} an array of strings describing the key route to the current node
 */
function getKeyPath(node) {
  if (!node.parent) {
    return ["root"];
  }

  return [(node.data && node.data.name) || node.name].concat(
    getKeyPath(node.parent),
  );
}

/**
 * Recursively modify data depending on whether or not each cell has been selected by the hover/highlight
 * @param {Object} data - the current node being considered
 * @param {Object|Boolean} keyPath - a map of keys that are in the highlight path
 * if this is false then all nodes are marked as selected
 * @returns {Object} Updated tree structure
 */
function updateData(data, keyPath) {
  if (data?.children) {
    data.children.map((child) => updateData(child, keyPath));
  }
  // add a fill to all the uncolored cells
  if (!data.hex) {
    data.style = {
      fill: EXTENDED_DISCRETE_COLOR_RANGE[5],
    };
  }
  data.style = {
    ...data.style,
    fillOpacity: keyPath && !keyPath[data.name] ? 0.2 : 1,
  };
  return data;
}

const defaultData = updateData(DefaultValue, false);
const colorList = [
  "#12939A",
  "#125C77",
  "#4DC19C",
  "#DDB27C",
  "#88572C",
  "#223F9A",
  "#DA70BF",
  "#FF5733",
  "#C70039",
  "#900C3F",
  "#581845",
  "#1C2833",
  "#BFC9CA",
  "#ABB2B9",
  "#2E4053",
  "#212F3C",
  "#5D6D7E",
  "#34495E",
  "#16A085",
  "#1ABC9C",
  "#2ECC71",
  "#27AE60",
  "#2980B9",
  "#8E44AD",
  "#2C3E50",
  "#F1C40F",
  "#E67E22",
  "#E74C3C",
  "#ECF0F1",
];
function createChartData(rebalanceSuggestions, netWorth) {
  if (!rebalanceSuggestions || rebalanceSuggestions.length === 0) return;
  let aggregatedBalanceDict = {};
  let uniqueIdToMetaDataMapping = {};
  rebalanceSuggestions.forEach((item) => {
    item?.suggestions_for_positions.forEach(
      ({ symbol: uniqueId, balanceUSD, apr }) => {
        aggregatedBalanceDict[uniqueId] =
          (aggregatedBalanceDict[uniqueId] || 0) + balanceUSD;
        uniqueIdToMetaDataMapping[uniqueId] = (apr * 100).toFixed(0);
      },
    );
  });

  aggregatedBalanceDict = Object.fromEntries(
    Object.entries(aggregatedBalanceDict).map(([key, value]) => [
      key,
      ((value / netWorth) * 100).toFixed(2),
    ]),
  );
  return {
    children: rebalanceSuggestions.map((categoryObj, idx) => {
      return {
        name: `${
          CategoryTranslation[categoryObj.category] || categoryObj.category
        }: ${getPercentage(
          categoryObj.sum_of_this_category_in_the_portfolio,
          netWorth,
        )}%`,
        hex: colorList[idx],
        children: categoryObj.suggestions_for_positions
          .slice()
          .sort((a, b) => b.balanceUSD - a.balanceUSD)
          .map((subCategoryObj) => {
            return {
              name: `${subCategoryObj.symbol.split("/")[0]}:${
                subCategoryObj.symbol.split("/")[
                  subCategoryObj.symbol.split("/").length - 1
                ]
              }, APR: ${
                uniqueIdToMetaDataMapping[subCategoryObj.symbol]
              }% PER: ${getPercentage(subCategoryObj.balanceUSD, netWorth)}%`,
              value: subCategoryObj.balanceUSD,
              hex: colorList[idx],
            };
          }),
      };
    }),
  };
}

export async function convertPortfolioStrategyToChartDataV2(portfolioHelper) {
  const portfolioAPRData = await portfolioHelper.getPortfolioMetadata();
  let result = { children: [] };
  let idx = 0;
  // need to refactor
  let nameToColor = {};
  for (const [category, protocols] of Object.entries(
    portfolioHelper.strategy,
  )) {
    for (const protocolArray of Object.values(protocols)) {
      for (const protocol of protocolArray) {
        const weightedValue = protocol.weight * 100;
        const keyForpoolsMetadata = protocol.interface.uniqueId();
        const aprOfProtocol = portfolioAPRData[keyForpoolsMetadata]?.apr * 100;
        const name = `${protocol.interface.toString()},APR: ${aprOfProtocol.toFixed(
          2,
        )}%`;
        [nameToColor, idx] = _prepareSunburstData(
          result,
          nameToColor,
          name,
          idx,
          category,
          weightedValue,
        );
      }
    }
  }
  return [result, portfolioAPRData.portfolioAPR];
}

export function _prepareSunburstData(
  result,
  nameToColor,
  name,
  idx,
  category,
  weightedValue,
) {
  let colorForThisName;
  if (nameToColor[name]) {
    colorForThisName = nameToColor[name];
  } else {
    colorForThisName = colorList[idx];
    nameToColor[name] = colorForThisName;
    idx = (idx + 1) % colorList.length;
  }
  const payloadForSunburst = {
    name,
    value: weightedValue,
    hex: colorForThisName,
  };
  const categoryObj = result?.children.find((obj) => obj.name === category);
  if (categoryObj) {
    categoryObj.children.push(payloadForSunburst);
  } else {
    result.children.push({
      name: category,
      children: [payloadForSunburst],
      hex: colorList[idx],
    });
    idx = (idx + 1) % colorList.length;
  }
  return [nameToColor, idx];
}

function getPercentage(value, total) {
  return Math.round((value / total) * 100);
}

export default function RebalanceChart(props) {
  const {
    rebalanceSuggestions,
    netWorth,
    showCategory,
    mode,
    portfolio_apr,
    color,
    wording,
    portfolioStrategyName,
  } = props;
  const [data, setData] = useState(defaultData);
  const [apr, setAPR] = useState(0);
  const [finalValue, setFinalValue] = useState("");
  const [clicked, setClicked] = useState(false);
  const { strategyMetadata } = useSelector((state) => state.strategyMetadata);
  const account = useActiveAccount();

  const LABEL_STYLE = {
    fontSize: "16px",
    textAnchor: "middle",
    fill: color,
    whitespace: "pre-wrap",
    color: color,
  };
  const [hoveredItemIndex, setHoveredItemIndex] = useState(null);

  const handleMouseEnter = useCallback(
    (index) => () => {
      setHoveredItemIndex(index);
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredItemIndex(null);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (mode === "portfolioStrategy") {
        let portfolioHelper;
          portfolioHelper = getPortfolioHelper(portfolioStrategyName);
          const [chartData, totalAPR] =
            await convertPortfolioStrategyToChartDataV2(portfolioHelper);
          setData(chartData);
          setAPR(totalAPR);
      } else {
        if (!rebalanceSuggestions || rebalanceSuggestions.length === 0) return;
        // set showCategory = true, to show its category. For instance, long_term_bond

        const chartData = createChartData(
          rebalanceSuggestions,
          netWorth,
          showCategory,
        );
        setData(chartData);
        setAPR(portfolio_apr);
      }
    }
    fetchData();
  }, [props]);
  if (
    account !== undefined &&
    data.children[0].name === "Loading..." &&
    !rebalanceSuggestions
  ) {
    // wallet is connected but data is loading
    return (
      <center role="sunburst-chart-spin">
        <Spin size="large" />
      </center>
    ); // Loading
  } else if (
    rebalanceSuggestions &&
    rebalanceSuggestions.length === 0 &&
    account?.address !== undefined
  ) {
    // wallet is connected but no data
    return <AntdInstructions account={account} />;
  }
  return (
    <div className="bg-gray-800 mt-4 p-4">
      <h4 className="text-xl font-semibold text-white">{wording}</h4>
      <div
        className="sm:flex items-center justify-around"
        role="sunburst-chart"
      >
        {
          // wallet is not connected
          account === undefined ? <ConfiguredConnectButton /> : null
        }
        <Sunburst
          animation
          hideRootNode
          onValueMouseOver={(node) => {
            if (clicked) {
              return;
            }
            const path = getKeyPath(node).reverse();
            const pathAsMap = path.reduce((res, row) => {
              res[row] = true;
              return res;
            }, {});
            setFinalValue(path[path.length - 1]);
            setData(updateData(data, pathAsMap));
          }}
          onValueMouseOut={() => {
            if (!clicked) {
              setFinalValue(false);
              setData(updateData(data, false));
            }
          }}
          onValueClick={() => setClicked(!clicked)}
          style={{
            stroke: "#ddd",
            strokeOpacity: 0.3,
            strokeWidth: "0.5",
          }}
          colorType="literal"
          getSize={(d) => d.value}
          getColor={(d) => d.hex}
          data={data}
          height={props.windowWidth > 767 ? 500 : 300}
          width={props.windowWidth > 767 ? 500 : 300}
        >
          {finalValue ? (
            <LabelSeries
              data={[{ x: 0, y: 0, label: finalValue, style: LABEL_STYLE }]}
            />
          ) : (
            <LabelSeries
              data={[{ x: 0, y: 0, label: wording, style: LABEL_STYLE }]}
            />
          )}
        </Sunburst>
        <div className="mt-2 sm:mt-0">
          {data.children[0].name !== "Loading..."
            ? data.children.map((item, index) => {
                return (
                  <div key={index}>
                    <div
                      className="flex items-center justify-between mb-2"
                      onMouseEnter={handleMouseEnter(index)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="flex items-center">
                        <div
                          className="w-5 h-5 me-2 rounded"
                          style={{ backgroundColor: item.hex }}
                        ></div>
                        <p className="me-2">{item.name.split(":")[0]}</p>
                      </div>
                      <p>{item.name.split(":")[1]}</p>
                    </div>
                    {hoveredItemIndex === index ? (
                      <div className="absolute w-80 bg-gray-500 text-white p-2 rounded z-10">
                        {item.children
                          ? item.children.map((subItem, subIndex) => (
                              <div key={subIndex}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <div
                                      className="w-5 h-5 me-2 rounded flex-shrink-0"
                                      style={{ backgroundColor: subItem.hex }}
                                    ></div>
                                    <p className="max-w-40">
                                      {subItem.name.split(",")[0]}
                                    </p>
                                  </div>
                                  <p>{subItem.name.split(",")[1]}</p>
                                </div>
                              </div>
                            ))
                          : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            : null}
        </div>
      </div>
    </div>
  );
}

const AntdInstructions = ({ account }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(account.address);
    message.success("Address copied to clipboard");
  };

  return (
    <div className="bg-gray-800 mt-4 p-4">
      <div>
        <Title level={3}>1. Visualize Your Bundle</Title>
        <Paragraph>
          Visit the{" "}
          <Link href="/bundle" style={{ color: "#1890ff" }}>
            Bundle
          </Link>{" "}
          page to visualize your bundle, including all tokens in your wallet.
          View performance metrics and calculate your ROI and APR.
        </Paragraph>
      </div>

      <div>
        <Title level={3}>2. Fund Your Account</Title>
        <Paragraph>
          Please deposit assets into your AA wallet:
          <br />
          <div className="flex items-center mt-1">
            <Text code>{`${account.address.slice(
              0,
              6,
            )}...${account.address.slice(-4)}`}</Text>
            <button
              type="button"
              className="ms-2 rounded-full p-1 text-white shadow-sm"
              style={{ backgroundColor: "#5DFDCB" }}
              onClick={copyToClipboard}
            >
              <CopyIcon className="h-5 w-5 justify-center text-black" />
            </button>
          </div>
        </Paragraph>
      </div>
    </div>
  );
};
