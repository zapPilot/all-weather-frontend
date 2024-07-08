import { CamelotV3 } from "./camelot/Camelotv3";
import React from "react";
import { sendBatchTransaction } from "thirdweb";
import THIRDWEB_CLIENT from "../utils/thirdweb";

// add/change these values
const precisionOfInvestAmount = 4;
const pendleAddress = "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8";
const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const linkAddress = "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4";
const usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const gmxAddress = "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a";
const wsolAddress = "0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07";
const rdntAddress = "0x3082CC23568eA640225c2467653dB90e9250AaA0";
const magicAddress = "0x539bdE0d7Dbd336b79148AA742883198BBF60342";
const wstEthAddress = "0x5979D7b546E38E414F7E9822514be443A4800529";
const tiaAddress = "0xD56734d7f9979dD94FAE3d67C7e928234e71cD4C";
const kujiAddress = "0x3A18dcC9745eDcD1Ef33ecB93b0b6eBA5671e7Ca";
const axlAddress = "0x23ee2343B892b1BB63503a4FAbc840E0e2C6810f";

export class AllWeatherPortfolio extends React.Component {
  constructor() {
    super();
    this.strategyMetadata = {};
    this.weightMapping = {
      long_term_bond: 0,
      intermediate_term_bond: 0.15 * 2,
      commodities: 0.06 * 2,
      gold: 0.06 * 2,
      large_cap_us_stocks: 0.12 * 2,
      small_cap_us_stocks: 0.02 * 2,
      non_us_developed_market_stocks: 0.06 * 2,
      non_us_emerging_market_stocks: 0.03 * 2,
    };
  }
  async initialize() {
    try {
      const strategy = this.getStrategyData(
        "0x0000000000000000000000000000000000000000",
      );
      const allProtocols = Object.values(strategy).flatMap((protocols) =>
        Object.entries(protocols).flatMap(([chain, protocolArray]) =>
          protocolArray.map((protocol) => ({ chain, protocol })),
        ),
      );

      const results = await Promise.all(
        allProtocols.map(async ({ chain, protocol }) => {
          const symbolList = protocol.interface.symbolList.join("+");
          const sortedSymbolList = protocol.interface.symbolList
            .sort()
            .join("-");
          const url = `${process.env.NEXT_PUBLIC_API_URL}/pool/apr?chain=${chain}&project_id=${protocol.interface.constructor.projectID}&project_version=${protocol.interface.constructor.projectVersion}&symbol_list=${symbolList}`;

          try {
            const response = await fetch(url);
            const data = await response.json();
            const key = `${chain}/${protocol.interface.constructor.protocolName}:${sortedSymbolList}`;
            return { key, data };
          } catch (error) {
            console.error(`Error fetching data for ${url}:`, error);
            return null;
          }
        }),
      );

      results.forEach((result) => {
        if (result) {
          this.strategyMetadata[result.key] = result.data;
        }
      });
    } catch (error) {
      console.error("Error initializing strategy metadata:", error);
    }
  }
  getStrategyData(address) {
    return {
      // long_term_bond: {
      //   "arb": [
      //     {
      //       interface: new CamelotV3(
      //         42161,
      //         wstEthAddress,
      //         wethAddress,
      //         address,
      //       ),
      //       weight: 0.4,
      //     },
      //   ],
      // },
      intermediate_term_bond: {
        arb: [
          {
            interface: new CamelotV3(
              42161,
              ["pendle", "eth"],
              pendleAddress,
              wethAddress,
              address,
            ),
            weight: this.weightMapping.intermediate_term_bond,
          },
        ],
      },
      commodities: {
        arb: [
          {
            interface: new CamelotV3(
              42161,
              ["link", "eth"],
              wethAddress,
              linkAddress,
              address,
            ),
            weight: this.weightMapping.commodities,
          },
        ],
      },
      gold: {
        arb: [
          {
            interface: new CamelotV3(
              42161,
              ["usdc", "eth"],

              wethAddress,
              usdcAddress,
              address,
            ),
            weight: this.weightMapping.gold,
          },
        ],
      },
      large_cap_us_stocks: {
        arb: [
          {
            interface: new CamelotV3(
              42161,
              ["tia.n", "eth"],
              wethAddress,
              tiaAddress,
              address,
            ),
            weight: this.weightMapping.large_cap_us_stocks,
          },
        ],
      },
      small_cap_us_stocks: {
        arb: [
          {
            interface: new CamelotV3(
              42161,
              ["axl", "usdc"],
              axlAddress,
              usdcAddress,
              address,
            ),
            weight: this.weightMapping.small_cap_us_stocks,
          },
        ],
      },
      non_us_developed_market_stocks: {
        arb: [
          {
            interface: new CamelotV3(
              42161,
              ["sol", "usdc"],

              wsolAddress,
              usdcAddress,
              address,
            ),
            weight: this.weightMapping.non_us_developed_market_stocks,
          },
        ],
      },
      non_us_emerging_market_stocks: {
        arb: [
          {
            interface: new CamelotV3(
              42161,
              ["kuji", "eth"],

              kujiAddress,
              wethAddress,
              address,
            ),
            weight: this.weightMapping.non_us_emerging_market_stocks,
          },
        ],
      },
    };
  }
  setStrategyMetadata(strategyMetadata) {
    this.strategyMetadata = strategyMetadata;
  }
  async diversify(account, investmentAmount, chosenToken, progressCallback) {
    const strategy = this.getStrategyData(account.address);
    const totalSteps = Object.keys(strategy).length;
    let completedSteps = 0;
    const updateProgress = () => {
      console.log("Completed steps:", completedSteps);
      completedSteps++;
      progressCallback((completedSteps / totalSteps) * 100);
    };

    let txns = [];
    const retryIndexArray = this.initializeDynamic2DArray(strategy);
    let rowIndex = 0;
    let colIndex = 0;
    for (const [category, protocolsInThisCategory] of Object.entries(
      strategy,
    )) {
      for (const protocols of Object.values(protocolsInThisCategory)) {
        const [txn, retryIndex] = await this._retryFunction(
          this._investInThisCategory.bind(this),
          { investmentAmount, chosenToken, protocols, category },
          { retries: 5, delay: 1000 },
        );
        retryIndexArray[rowIndex][colIndex] = retryIndex;
        txns.push(txn);
        colIndex++;
      }
      updateProgress();
      rowIndex++;
    }
    return txns;
  }
  async _investInThisCategory({
    investmentAmount,
    chosenToken,
    protocols,
    category,
    retryIndex,
  }) {
    // clear the transaction batch
    let concurrentRequests = [];
    for (const protocol of protocols) {
      const investPromise = protocol.interface.invest(
        (investmentAmount * protocol.weight).toFixed(precisionOfInvestAmount),
        chosenToken,
        retryIndex,
      );
      concurrentRequests.push(investPromise);
    }
    return await Promise.all(concurrentRequests);
  }

  async _retryFunction(fn, params, options = {}) {
    const { retries = 3, delay = 1000 } = options; // Set defaults

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        params.retryIndex = attempt - 1;
        const result = await fn(params);
        return [result, params.retryIndex]; // Exit on successful execution
      } catch (error) {
        console.error(
          `Attempt ${params.category} ${attempt}/${retries}: Error occurred, retrying...`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retry
      }
    }
    throw new Error(`Function failed after ${retries} retries`); // Throw error if all retries fail
  }
  initializeDynamic2DArray(strategy) {
    const retryIndexArray = [];

    for (const protocolsInThisCategory of Object.values(strategy)) {
      const row = Array(Object.keys(protocolsInThisCategory).length).fill(0);
      retryIndexArray.push(row);
    }

    return retryIndexArray;
  }
}
