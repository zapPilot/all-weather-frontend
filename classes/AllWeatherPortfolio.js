import { smartWallet } from "thirdweb/wallets";
import { arbitrum } from "thirdweb/chains";
import { CamelotV3 } from "./camelot/Camelotv3";
import React from "react";
import { approve, transferFrom } from "thirdweb/extensions/erc20";
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

export class AllWeatherPortfolio extends React.Component {
  constructor(account) {
    super();
    if (!account) {
      return;
    }
    this.smartAccount = account;
    this.strategy = {
      long_term_bond: {
        42161: [
          {
            interface: new CamelotV3(
              42161,
              wstEthAddress,
              wethAddress,
              this.smartAccount.address,
            ),
            weight: 0.13,
            poolID:
              "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15:arb_camelot2:wstETH",
          },
        ],
      },
      intermediate_term_bond: {
        42161: [
          {
            interface: new CamelotV3(
              42161,
              pendleAddress,
              wethAddress,
              this.smartAccount.address,
            ),
            weight: 0.15 * 2,
            poolID:
              "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15:arb_camelot2:49661",
          },
        ],
      },
      commodities: {},
      gold: {
        42161: [
          {
            interface: new CamelotV3(
              42161,
              wethAddress,
              gmxAddress,
              this.smartAccount.address,
            ),
            weight: 0.075 * 2,
            poolID:
              "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15:arb_camelot2:gmx",
          },
        ],
      },
      large_cap_us_stocks: {
        42161: [
          {
            interface: new CamelotV3(
              42161,
              wethAddress,
              linkAddress,
              this.smartAccount.address,
            ),
            weight: 0.09 * 2,
            poolID:
              "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15:arb_camelot2:53459",
          },
        ],
      },
      small_cap_us_stocks: {
        42161: [
          {
            interface: new CamelotV3(
              42161,
              rdntAddress,
              wethAddress,
              this.smartAccount.address,
            ),
            weight: 0.03 * 2,
            poolID:
              "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15:arb_camelot2:rdnt",
          },
        ],
      },
      non_us_developed_market_stocks: {
        42161: [
          {
            interface: new CamelotV3(
              42161,
              wsolAddress,
              usdcAddress,
              this.smartAccount.address,
            ),
            weight: 0.06 * 2,
            poolID:
              "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15:arb_camelot2:sol",
          },
        ],
      },
      non_us_emerging_market_stocks: {
        42161: [
          {
            interface: new CamelotV3(
              42161,
              magicAddress,
              wethAddress,
              this.smartAccount.address,
            ),
            weight: 0.03 * 2,
            poolID:
              "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15:arb_camelot2:magic",
          },
        ],
      },
    };
    this.concatenatedString = Object.values(this.strategy)
      .flatMap(Object.values)
      .flatMap((arr) => arr)
      .map((obj) => obj.poolID)
      .join("/");
  }
  async initialize() {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/pools/${this.concatenatedString}`,
    )
      .then((response) => response.json())
      .then((data) => {
        this.poolsMetadata = data;
      })
      .catch((error) => this.setState({ error }));
    this._checkTotalWeight(this.strategy);
  }

  _checkTotalWeight(strategyObject) {
    let totalWeight = 0;
    for (const strategyKey in strategyObject) {
      const strategy = strategyObject[strategyKey]; // Access each strategy object
      for (const bondKey in strategy) {
        const bonds = strategy[bondKey]; // Access bond array within each strategy
        for (const bond of bonds) {
          totalWeight += bond.weight; // Access weight property and add to total
        }
      }
    }
    console.log("Total Weight: ", totalWeight);
    if (Math.abs(totalWeight - 1) > 0.0001) {
      throw new Error("Total weight of all protocols must be 1");
    }
  }
  async diversify(investmentAmount, chosenToken) {
    const transactionHashes = await this._diversify(
      investmentAmount,
      chosenToken,
    );
    return transactionHashes;
  }

  async _diversify(investmentAmount, chosenToken) {
    let txns = [];
    for (const [category, protocolsInThisCategory] of Object.entries(
      this.strategy,
    )) {
      for (const [chainId, protocols] of Object.entries(
        protocolsInThisCategory,
      )) {
        const txn = await this._retryFunction(
          this._investInThisCategory.bind(this),
          { investmentAmount, chosenToken, protocols, category },
          { retries: 5, delay: 1000 },
        );
        txns.push(txn);
      }
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
        return result; // Exit on successful execution
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
}
