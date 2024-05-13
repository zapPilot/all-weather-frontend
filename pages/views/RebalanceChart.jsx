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
import React, { useState, useEffect } from "react";
import { AllWeatherPortfolio } from "../../classes/AllWeatherPortfolio.js";

import { Sunburst, LabelSeries } from "react-vis";
import { EXTENDED_DISCRETE_COLOR_RANGE } from "react-vis/dist/theme";

const DefaultValue = {
  children: [
    {
      name: "Loading...",
      hex: "#12939A",
      children: [{ name: "Loading...", hex: "#12939A", value: 100 }],
    },
  ],
};
const LABEL_STYLE = {
  fontSize: "16px",
  textAnchor: "middle",
  fill: "white",
  whitespace: "pre-wrap",
  color: "white",
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
  if (data.children) {
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
  "#F15C17",
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
function createChartData(rebalanceSuggestions, netWorth, showCategory) {
  if (!rebalanceSuggestions || rebalanceSuggestions.length === 0) return;
  let aggregatedBalanceDict = {};
  let uniqueIdToMetaDataMapping = {};
  rebalanceSuggestions.forEach((item) => {
    item.suggestions_for_positions.forEach(
      ({ symbol: uniqueId, balanceUSD, metadata }) => {
        aggregatedBalanceDict[uniqueId] =
          (aggregatedBalanceDict[uniqueId] || 0) + balanceUSD;
        uniqueIdToMetaDataMapping[uniqueId] = metadata;
      },
    );
  });

  aggregatedBalanceDict = Object.fromEntries(
    Object.entries(aggregatedBalanceDict).map(([key, value]) => [
      key,
      ((value / netWorth) * 100).toFixed(2),
    ]),
  );

  if (!showCategory) {
    const aggregatedArray = Object.entries(aggregatedBalanceDict).sort(
      (a, b) => b[1] - a[1],
    );
    return {
      children: aggregatedArray.map(([uniqueId, value], idx) => {
        return {
          name:
            uniqueId.split(":")[1] +
            " " +
            uniqueIdToMetaDataMapping[uniqueId].symbol +
            " " +
            value +
            "%",
          hex: colorList[idx],
          value,
        };
      }),
    };
  }
  return {
    children: rebalanceSuggestions.map((categoryObj, idx) => {
      return {
        name: `${categoryObj.category}: ${getPercentage(
          categoryObj.sum_of_this_category_in_the_portfolio,
          netWorth,
        )}%`,
        hex: colorList[idx],
        children: categoryObj.suggestions_for_positions
          .slice()
          .sort((a, b) => b.balanceUSD - a.balanceUSD)
          .map((subCategoryObj) => {
            return {
              name:
                subCategoryObj.symbol.split(":")[1] +
                " " +
                uniqueIdToMetaDataMapping[subCategoryObj.symbol].symbol +
                " " +
                getPercentage(subCategoryObj.balanceUSD, netWorth) +
                "%",
              value: subCategoryObj.balanceUSD,
              hex: colorList[idx],
            };
          }),
      };
    }),
  };
}

function convertPortfolioCompositionToChartData(portfolioComposition) {
  let result = { children: [] };
  let idx = 0;

  // need to refactor
  let nameToColor = {};
  for (const positionObjsInThisCategory of portfolioComposition) {
    for (const positionObj of Object.values(positionObjsInThisCategory)) {
      for (const [category, weight] of positionObj.categories) {
        const weightedValue = weight.value * 100;
        const name = `${positionObj.pool.name}:${positionObj.tokens.join(
          "-",
        )}(${weightedValue}%)`;
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
  return result;
}

function convertPortfolioStrategyToChartData(
  strategy,
  mode = "",
  poolsMetadata = {},
) {
  let result = { children: [] };
  let idx = 0;

  // need to refactor
  let nameToColor = {};
  for (const [category, positionObjsInThisCategory] of strategy) {
    for (const positionObjs of Object.values(positionObjsInThisCategory)) {
      for (const positionObj of positionObjs) {
        const weightedValue = positionObj.weight * 100;
        const poolName = positionObj.poolID.split(":")[1];
        let name;
        if (mode === "portfolioStrategy") {
          const poolID = positionObj.poolID;
          const positionObjMetadata = poolsMetadata[poolID];
          name = `${poolName}:${positionObjMetadata?.metadata?.symbol}(${weightedValue}%)`;
        } else {
          name = `${poolName}:${positionObj.tokens.join(
            "-",
          )}(${weightedValue}%)`;
        }
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
  return result;
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
  const categoryObj = result.children.find((obj) => obj.name === category);
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

function calculatePortfolioAPR(portfolioComposition) {
  let result = 0;
  for (const positionObjsInThisCategory of portfolioComposition) {
    for (const positionObj of Object.values(positionObjsInThisCategory)) {
      for (const [_, weight] of positionObj.categories) {
        if (weight.only_for_sunburst_chart === true) {
          continue;
        }
        result += weight.value * positionObj.apr;
      }
    }
  }
  return result;
}
function calculatePortfolioAPRForAAWallet(portfolioComposition, poolsMetadata) {
  let result = 0;
  for (const positionObjsInThisCategory of portfolioComposition) {
    for (const positionObjs of Object.values(positionObjsInThisCategory)) {
      for (const positionObj of positionObjs) {
        // TODO(david): currently, `only_for_sunburst_chart` this field is missing in `portfolio_config` on the backend side
        // we need to figure out a way to consolidate `pool_optimier` and `portfolio_config`
        // if (weight.only_for_sunburst_chart === true) {
        //   continue;
        // }
        result +=
          positionObj.weight * poolsMetadata?.[positionObj.poolID]?.apr ?? 0;
      }
    }
  }
  return result * 100;
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
    portfolioComposition,
    account,
  } = props;
  const [data, setData] = useState(defaultData);
  const [apr, setAPR] = useState(0);
  const [finalValue, setFinalValue] = useState("Your Portfolio Chart");
  const [clicked, setClicked] = useState(false);
  const divSunBurst = {
    margin: "0 auto",
    height: props.windowWidth > 767 ? 500 : 300,
    width: props.windowWidth > 767 ? 500 : 300,
  };

  useEffect(() => {
    async function fetchData() {
      if (mode === "portfolioComposer" && portfolioComposition.length > 0) {
        const sortedPortfolioComposition = portfolioComposition.sort(
          (a, b) => b.weight - a.weight,
        );
        const chartData = convertPortfolioCompositionToChartData(
          sortedPortfolioComposition,
        );
        setData(chartData);
        setAPR(calculatePortfolioAPR(sortedPortfolioComposition));
      } else if (mode === "portfolioStrategy") {
        if (!account) return;
        const portfolioHelper = new AllWeatherPortfolio(account);
        await portfolioHelper.initialize();
        const chartData = convertPortfolioStrategyToChartData(
          Object.entries(portfolioHelper.strategy),
          mode,
          portfolioHelper.poolsMetadata,
        );
        setData(chartData);
        setAPR(
          calculatePortfolioAPRForAAWallet(
            Object.values(portfolioHelper.strategy),
            portfolioHelper.poolsMetadata,
          ),
        );
      } else {
        if (!rebalanceSuggestions) return;
        // set showCategory = true, to show its category. For instance, long_term_bond
        const chartData = createChartData(
          rebalanceSuggestions,
          netWorth,
          showCategory,
        );
        setData(chartData);
      }
    }
    fetchData();
  }, [props]);
  return (
    <div style={divSunBurst} role="sunburst-chart">
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
        {finalValue && (
          <LabelSeries
            data={[{ x: 0, y: 0, label: finalValue, style: LABEL_STYLE }]}
          />
        )}
      </Sunburst>
      <center style={LABEL_STYLE}>APR: {apr.toFixed(2)}%</center>
    </div>
  );
}
