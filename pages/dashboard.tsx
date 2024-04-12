import type { NextPage } from "next";
import Image from "next/image";
import BasePage from "./basePage.tsx";
import { Spin, Button } from "antd";
import {
  UnlockOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { useWindowHeight } from "../utils/chartUtils.js";
import { investByAAWallet } from "../utils/etherspot.js";

import {
  getBasicColumnsForSuggestionsTable,
  getExpandableColumnsForSuggestionsTable,
  columnMapping,
} from "../utils/tableExpansionUtils";
import { useState, useEffect, ChangeEventHandler } from "react";
import RebalanceChart from "./views/RebalanceChart";
import { useAccount } from "wagmi";
import TokenDropdownInput from "./views/TokenDropdownInput.jsx";
import LinkModal from "./views/components/LinkModal";
import axios from "axios";

interface Pools {
  key: string;
  apr: number;
  tokens: string[];
  data: Pool[];
  unexpandable: boolean;
  // ... include other relevant properties as needed
}
interface Pool {
  [key: string]: any;
  pool: { meta: string; name: string; poolID: string };
}
interface queriesObj {
  wording: string;
  category: string;
  setStateMethod: (newValue: any) => void; // Assuming setStateMethod is a function that takes any type as an argument
  state: Pools[] | null;
  setUniqueQueryTokens: (newValue: any) => void;
  uniqueQueryTokens: Array<string>;
  unexpandable: boolean | undefined;
  setUnexpandable: (key: string, value: boolean) => void;
  chain_blacklist?: string[];
  chain_whitelist?: string[];
}

const Dashboard: NextPage = () => {
  const userApiKey = "placeholder";
  const { address: walletAddress } = useAccount();

  const windowHeight = useWindowHeight();
  const divBetterPools = {
    padding: "0 8px",
    minHeight: windowHeight,
    color: "#ffffff",
  };
  const [protocolList, setProtocolList] = useState([]);
  const [protocolLink, setProtocolLink] = useState("");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<Boolean>(false);

  const handleLinkButton = (url: string) => {
    setProtocolLink(url);
  };

  const basicColumns = getBasicColumnsForSuggestionsTable(
    protocolList,
    handleLinkButton,
    setLinkModalOpen,
    subscriptionStatus,
  );
  const expandableColumns = getExpandableColumnsForSuggestionsTable();
  const [btc, setBTC] = useState<Pools[] | null>(null);
  const [longTermBond, setLongTermBond] = useState<Pools[] | null>(null);
  const [intermediateTermBond, setIntermediateTermBond] = useState<
    Pools[] | null
  >(null);
  const [goldData, setGoldData] = useState<Pools[] | null>(null);
  const [commodities, setCommodities] = useState<Pools[] | null>(null);
  const [large_cap_us_stocks, set_large_cap_us_stocks] = useState<
    Pools[] | null
  >(null);
  const [small_cap_us_stocks, set_small_cap_us_stocks] = useState<
    Pools[] | null
  >(null);
  const [non_us_developed_market_stocks, set_non_us_developed_market_stocks] =
    useState<Pools[] | null>(null);
  const [non_us_emerging_market_stocks, set_non_us_emerging_market_stocks] =
    useState<Pools[] | null>(null);
  const [airdrop, set_airdrop] = useState<Pools[] | null>(null);

  const [BTCFilterDict, setBTCFilterDict] = useState([]);
  const [longTermBondFilterDict, setLongTermBondFilterDict] = useState([]);
  const [intermediateTermBondFilterDict, setIntermediateTermBondFilterDict] =
    useState([]);
  const [goldDataFilterDict, setGoldDataFilterDict] = useState([]);
  const [commoditiesFilterDict, setCommoditiesFilterDict] = useState([]);
  const [large_cap_us_stocksFilterDict, setLarge_cap_us_stocksFilterDict] =
    useState([]);
  const [small_cap_us_stocksFilterDict, setSmall_cap_us_stocksFilterDict] =
    useState([]);
  const [
    non_us_developed_market_stocksFilterDict,
    setNon_us_developed_market_stocksFilterDict,
  ] = useState([]);
  const [
    non_us_emerging_market_stocksFilterDict,
    setNon_us_emerging_market_stocksFilterDict,
  ] = useState([]);
  const [airdropFilterDict, setAirdropFilterDict] = useState([]);

  // states for unexpandable
  const [unexpandable, setUnexpandable] = useState<{ [key: string]: boolean }>({
    long_term_bond: true,
    intermediate_term_bond: true,
    commodities: true,
    gold: true,
    large_cap_us_stocks: true,
    small_cap_us_stocks: true,
    non_us_developed_market_stocks: true,
    non_us_emerging_market_stocks: true,
    airdrop: true,
  });
  const updateState = (key: string, value: boolean) => {
    setUnexpandable((prevState) => ({
      ...prevState,
      [key]: value,
    }));
  };
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleExpand = (rowKey: string) => {
    setExpandedRows((prevExpandedRows) => {
      const isExpanded = prevExpandedRows[rowKey];
      return {
        ...prevExpandedRows,
        [rowKey]: !isExpanded,
      };
    });
  };

  const [portfolioComposition, setPortfolioComposition] = useState<{
    [key: string]: any;
  }>({});
  const [portfolioCompositionForReRender, setPortfolioCompositionForReRender] =
    useState<{
      [key: string]: any;
    }>({});

  const topN = 5;
  const queriesForAllWeather: queriesObj[] = [
    {
      wording: "BTC",
      category: "btc",
      setStateMethod: setBTC,
      state: btc,
      setUniqueQueryTokens: setBTCFilterDict,
      uniqueQueryTokens: BTCFilterDict,
      unexpandable: unexpandable.btc,
      setUnexpandable: updateState,
    },
    {
      wording: "Long Term Bond (40%)",
      category: "long_term_bond",
      setStateMethod: setLongTermBond,
      state: longTermBond,
      setUniqueQueryTokens: setLongTermBondFilterDict,
      uniqueQueryTokens: longTermBondFilterDict,
      unexpandable: unexpandable.long_term_bond,
      setUnexpandable: updateState,
    },
    {
      wording: "Intermediate Term Bond (15%)",
      category: "intermediate_term_bond",
      setStateMethod: setIntermediateTermBond,
      state: intermediateTermBond,
      setUniqueQueryTokens: setIntermediateTermBondFilterDict,
      uniqueQueryTokens: intermediateTermBondFilterDict,
      unexpandable: unexpandable.intermediate_term_bond,
      setUnexpandable: updateState,
    },
    {
      wording: "Commodities (7.5%)",
      category: "commodities",
      setStateMethod: setCommodities,
      state: commodities,
      setUniqueQueryTokens: setCommoditiesFilterDict,
      uniqueQueryTokens: commoditiesFilterDict,
      unexpandable: unexpandable.commodities,
      setUnexpandable: updateState,
    },
    {
      wording: "Gold (7.5%)",
      category: "gold",
      setStateMethod: setGoldData,
      state: goldData,
      setUniqueQueryTokens: setGoldDataFilterDict,
      uniqueQueryTokens: goldDataFilterDict,
      unexpandable: unexpandable.gold,
      setUnexpandable: updateState,
    },
    {
      wording: "Large Cap US Stocks (18%)",
      category: "large_cap_us_stocks",
      setStateMethod: set_large_cap_us_stocks,
      state: large_cap_us_stocks,
      setUniqueQueryTokens: setLarge_cap_us_stocksFilterDict,
      uniqueQueryTokens: large_cap_us_stocksFilterDict,
      unexpandable: unexpandable.large_cap_us_stocks,
      setUnexpandable: updateState,
    },
    {
      wording: "Small Cap US Stocks (3%)",
      category: "small_cap_us_stocks",
      setStateMethod: set_small_cap_us_stocks,
      state: small_cap_us_stocks,
      setUniqueQueryTokens: setSmall_cap_us_stocksFilterDict,
      uniqueQueryTokens: small_cap_us_stocksFilterDict,
      unexpandable: unexpandable.small_cap_us_stocks,
      setUnexpandable: updateState,
      chain_blacklist: ["cardano", "fantom"],
    },
    {
      wording: "Non US Developed Market Stocks (6%)",
      category: "non_us_developed_market_stocks",
      setStateMethod: set_non_us_developed_market_stocks,
      state: non_us_developed_market_stocks,
      setUniqueQueryTokens: setNon_us_developed_market_stocksFilterDict,
      uniqueQueryTokens: non_us_developed_market_stocksFilterDict,
      unexpandable: unexpandable.non_us_developed_market_stocks,
      setUnexpandable: updateState,
    },
    {
      wording: "Non US Emerging Market Stocks (3%)",
      category: "non_us_emerging_market_stocks",
      setStateMethod: set_non_us_emerging_market_stocks,
      state: non_us_emerging_market_stocks,
      setUniqueQueryTokens: setNon_us_emerging_market_stocksFilterDict,
      uniqueQueryTokens: non_us_emerging_market_stocksFilterDict,
      unexpandable: unexpandable.non_us_emerging_market_stocks,
      setUnexpandable: updateState,
    },
    {
      wording: "Airdrop",
      category: "airdrop",
      setStateMethod: set_airdrop,
      state: airdrop,
      setUniqueQueryTokens: setAirdropFilterDict,
      uniqueQueryTokens: airdropFilterDict,
      unexpandable: unexpandable.airdrop,
      setUnexpandable: updateState,
      chain_whitelist: [
        "blast",
        "mode",
        "zksync era",
        "linea",
        "scroll",
        "taiko",
      ],
    },
  ];

  const uniqueTokens = new Set();
  queriesForAllWeather.forEach((item) => {
    // @ts-ignore
    item.uniqueQueryTokens.forEach((query: string) => {
      uniqueTokens.add(query);
    });
  });

  const tableRowMobile = ["Tokens", "Chain", "Pool", "TVL", "APR"];

  useEffect(() => {
    const fetchDefaultPools = async () => {
      try {
        for (const categoryMetaData of Object.values(queriesForAllWeather)) {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/all_weather_pools`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_api_key: userApiKey,
                category: categoryMetaData.category,
                top_n: topN,
                ...(categoryMetaData.chain_blacklist && {
                  chain_blacklist: categoryMetaData.chain_blacklist,
                }),
                ...(categoryMetaData.chain_whitelist && {
                  chain_whitelist: categoryMetaData.chain_whitelist,
                }),
              }),
            },
          );
          const json = await response.json();
          categoryMetaData.setStateMethod(json.data);
          categoryMetaData.setUniqueQueryTokens(json.unique_query_tokens);
          categoryMetaData.setUnexpandable(
            categoryMetaData.category,
            json.unexpandable,
          );
        }
      } catch (error) {
        console.log("failed to fetch pool data", error);
      }
    };

    fetchDefaultPools();
  }, []);

  useEffect(() => {
    const fetchProtocolList = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SDK_API_URL}/protocols`,
        );
        const data = JSON.parse(response.data);

        setProtocolList(data);
      } catch (error) {
        console.error("An error occurred while fetching protocol link:", error);
        throw error;
      }
    };
    const fetchSubscriptionStatus = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SDK_API_URL}/subscriptions?address=${walletAddress}`,
        );
        setSubscriptionStatus(response.data.subscriptionStatus);
      } catch (error) {
        console.error(
          "An error occurred while fetching subscription status:",
          error,
        );
        throw error;
      }
    };

    fetchProtocolList();
    fetchSubscriptionStatus();
  }, []);

  const expandedRowRender = (records: Pools) => {
    const columns = [
      columnMapping("")["chain"],
      columnMapping(
        protocolList,
        handleLinkButton,
        setLinkModalOpen,
        subscriptionStatus,
      )["pool"],
      columnMapping("")["tokens"],
      columnMapping("")["tvlUsd"],
      columnMapping("")["apr"],
    ];
    return (
      <>
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr className="bg-white">
              <th
                scope="col"
                className="relative px-7 hidden sm:w-12 sm:px-6 sm:table-cell"
              ></th>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-3 py-3.5 text-left text-sm font-semibold text-black ${
                    index > 1 ? "hidden " : ""
                  }sm:table-cell`}
                >
                  {index == 1 ? (
                    <span className="sm:hidden">Pool</span>
                  ) : (
                    <span className="hidden sm:block">{column.title}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {records.data.map((item, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-black-900">
                <td className="relative px-7 sm:w-12 sm:px-6">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    onChange={(e) =>
                      e.target.checked ? onSelectCallback(item, true) : null
                    }
                  />
                </td>
                {columns.map((column, index) => (
                  <>
                    {
                    column.key === "chain" ?
                      (
                          // @ts-ignore
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                          <Image
                            // @ts-ignore
                            src={column.content(item[column.key]).chainImg}
                            // @ts-ignore
                            alt={column.content(item[column.key]).chainAlt}
                            className="hidden sm:block"
                            height={20}
                            width={20}
                          />
                          <div className="grid grid-cols-2 gap-4 sm:hidden">
                            {tableRowMobile.map((title, index) => {
                              const column = basicColumns.find(
                                (column) => column.title === title,
                              );
                              if (!column) return null;
                              return (
                                <>
                                  {
                                    column.title === "Tokens" &&
                                    (
                                    <div className="col-span-2">
                                      <div className="flex items-center">
                                        {
                                          column.content(item[column.key])
                                          // @ts-ignore
                                          .map((item, index) => (
                                            <Image
                                              src={`/tokenPictures/${item.replace(
                                                /[()]/g,
                                                "",
                                              )}.webp`}
                                              key={item}
                                              alt={item}
                                              height={20}
                                              width={20}
                                            />
                                          ))}
                                        <p className="text-white text-xl font-medium px-2">
                                          {
                                            // @ts-ignore
                                            column.content(item[column.key]).length > 1 ?
                                            // @ts-ignore
                                            column.content(item[column.key]).join("-")
                                            : column.content(item[column.key])
                                          }
                                        </p>
                                      </div>
                                    </div>
                                    )
                                  }
                                  {column.title === "TVL" &&
                                    (
                                      <div className="col-span-1">
                                        <p className="text-gray-400 text-sm font-medium">
                                          TVL
                                        </p>
                                        <span
                                          className={
                                            // @ts-ignore
                                            column.content(item[column.key]).danger == 1 ?
                                            "block px-2 text-red-400"
                                            : "block px-2 text-white"
                                          }
                                        >
                                          {// @ts-ignore
                                            column.content(item[column.key]).tvlUsdCount
                                          }M
                                        </span>
                                      </div>
                                    )
                                  }
                                  {
                                    column.title === "APR" &&
                                    (
                                      <div className="col-span-1">
                                        <p className="text-gray-400 text-sm font-medium">
                                          APR
                                        </p>
                                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                          {// @ts-ignore
                                            column.content(item[column.key]).aprVal
                                          }
                                          %
                                        </span>
                                        {// @ts-ignore
                                          column.content(item[column.key]).aprPredicted === "Down" ?
                                          <ArrowDownOutlined className="text-red-400 px-2" />
                                          :<ArrowUpOutlined className="text-green-400 px-2" />
                                        }
                                      </div>
                                    )
                                  }
                                  {
                                    column.title === "Chain" &&
                                    (
                                      <div className="col-span-1">
                                        <p className="text-gray-400 text-sm font-medium">
                                          Chain
                                        </p>
                                        <Image
                                          src={
                                            // @ts-ignore
                                            column.content(item[column.key]).chainImg
                                          }
                                          alt={
                                            // @ts-ignore
                                            column.content(item[column.key]).chainAlt
                                          }
                                          height={20}
                                          width={20}
                                        />
                                      </div>
                                    )
                                  }
                                  {
                                    column.title === "Pool" &&
                                    (
                                      <div className="col-span-1">
                                        <p className="text-gray-400 text-sm font-medium">DEX</p>
                                        {// @ts-ignore
                                          column.content(item[column.key]).paidUser || rowIndex > 0 ?
                                            <div>
                                              <button
                                                type="button"
                                                className="text-sm text-gray-400 shadow-sm hover:text-white"
                                                onClick={() => {
                                                  // @ts-ignore
                                                  handleLinkButton(column.content(item[column.key]).protocolLink);
                                                  setLinkModalOpen(true);
                                                }}
                                              >
                                                <Image
                                                  src={`/projectPictures/${
                                                    // @ts-ignore
                                                    column.content(item[column.key]).pool.name
                                                  }.webp`}
                                                  alt={
                                                    // @ts-ignore
                                                    column.content( item[column.key]).pool.name
                                                  }
                                                  className="me-2"
                                                  height={20}
                                                  width={20}
                                                />
                                              </button>
                                              <div className="relative group">
                                                <span className="text-white pe-2">
                                                  {// @ts-ignore
                                                    column.content(item[column.key]).pool.name
                                                  }
                                                </span>
                                                <span className="hidden group-hover:inline-block bg-black/50 px-2 py-2 text-sm text-white border rounded-md absolute bottom-full left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
                                                  {
                                                  "pool ID: " +
                                                  // @ts-ignore
                                                  column.content(item[column.key]).pool.poolID
                                                  }
                                                </span>
                                                {
                                                  // @ts-ignore
                                                  column.content(item[column.key]).pool.meta ?
                                                  (
                                                    <p className="text-gray-400 text-xs pe-2">
                                                      {// @ts-ignore
                                                        column.content(item[column.key]).pool.meta
                                                      }
                                                    </p>
                                                  ) : ""
                                                }
                                              </div>
                                            </div>
                                          : (
                                              <button
                                                type="button"
                                                className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-400 px-2.5 py-1.5 text-sm"
                                              >
                                                <UnlockOutlined className="-ml-0.5 h-5 w-5" />
                                                30 Days Free Trial
                                              </button>
                                          )
                                        }
                                      </div>
                                    )
                                  }
                                </>
                              );
                            })}
                          </div>
                        </td>
                      )
                      : column.key === "pool" ?
                      (
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell">
                          {// @ts-ignore
                            column.content(item[column.key]).paidUser || rowIndex > 0 ?
                              <div className="flex items-center">
                                <Image
                                  src={`/projectPictures/${
                                    // @ts-ignore
                                    column.content(item[column.key]).pool.name
                                  }.webp`}
                                  alt={
                                    // @ts-ignore
                                    column.content(item[column.key]).pool.name
                                  }
                                  className="me-2"
                                  height={20}
                                  width={20}
                                />
                                <div className="relative group">
                                  <span className="text-white pe-2">
                                    {// @ts-ignore
                                      column.content(item[column.key]).pool.name
                                    }
                                  </span>
                                  <span className="hidden group-hover:inline-block bg-black/50 px-2 py-2 text-sm text-white border rounded-md absolute bottom-full left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
                                    {// @ts-ignore
                                      "pool ID: " + column.content(item[column.key]).pool.poolID
                                    }
                                  </span>
                                  {// @ts-ignore
                                    column.content(item[column.key]).pool.meta ? (
                                      <span className="text-gray-400 text-xs pe-2">
                                      {// @ts-ignore
                                        column.content(item[column.key]).pool.meta
                                      }
                                      </span>
                                    ) : ""}
                                </div>
                                <button
                                  type="button"
                                  className="text-sm text-gray-400 shadow-sm hover:text-white"
                                  onClick={() => {
                                    // @ts-ignore
                                    handleLinkButton(column.content(item[column.key]).protocolLink);
                                    setLinkModalOpen(true);
                                  }}
                                >
                                  <ExportOutlined />
                                </button>
                              </div>
                            : <button
                                type="button"
                                className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-400 px-2.5 py-1.5 text-sm text-black"
                              >
                                <UnlockOutlined className="-ml-0.5 h-5 w-5" />
                                30 Days Free Trial
                              </button>
                          }
                        </td>
                      )
                      : column.key === "tokens" ?
                      (
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell">
                          <div className="flex items-center">
                            {// @ts-ignore
                              column.content(item[column.key]).map((item: string, index: number) => (
                                <Image
                                  src={`/tokenPictures/${item.replace(
                                    /[()]/g,
                                    "",
                                  )}.webp`}
                                  key={item}
                                  alt={item}
                                  height={20}
                                  width={20}
                                />
                            ))}
                            <span className="text-white px-2">
                              {// @ts-ignore
                                column.content(item[column.key]).length > 1
                                // @ts-ignore
                                ? column.content(item[column.key]).join("-")
                                : column.content(item[column.key])}
                            </span>
                          </div>
                        </td>
                      )
                      : column.key === "tvlUsd" ?
                      (
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell">
                          <span
                            className={
                              // @ts-ignore
                              column.content(item[column.key]).danger == 1
                                ? "px-2 text-red-400"
                                : "px-2 text-white"
                            }
                          >
                            {// @ts-ignore
                            column.content(item[column.key]).tvlUsdCount
                            }M
                          </span>
                        </td>
                      )
                      : column.key === "apr" ?
                      (
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell">
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            {// @ts-ignore
                              column.content(item[column.key]).aprVal
                            }%
                          </span>
                          {// @ts-ignore
                            column.content(item[column.key]).aprPredicted === "Down" ?
                            <ArrowDownOutlined className="text-red-400 px-2" />
                            :<ArrowUpOutlined className="text-green-400 px-2" />
                          }
                        </td>
                      )
                      : (<td></td>)
                    }
                  </>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };
  const onSelectCallback = (record: Pool, selected: boolean) => {
    const originalPoolsCount =
      portfolioComposition[record.category_from_request] === undefined
        ? 0
        : Object.values(portfolioComposition[record.category_from_request])
            .length;
    if (selected === true) {
      const categoryPools = _getOrCreate(
        portfolioComposition,
        record.category_from_request,
      );
      categoryPools[record.pool.poolID] = record;
      portfolioComposition[record.category_from_request] = categoryPools;
    } else {
      delete portfolioComposition[record.category_from_request][
        record.pool.poolID
      ];
    }
    for (const [poolID, pool_record] of Object.entries(
      portfolioComposition[record.category_from_request],
    )) {
      for (
        let index = 0;
        // @ts-ignore
        index < pool_record.categories.length;
        index++
      ) {
        if (poolID === record.pool.poolID) {
          // @ts-ignore
          pool_record.categories[index][1].value =
            // @ts-ignore
            (pool_record.categories[index][1].value * record.category_weight) /
            (originalPoolsCount + 1);
        } else {
          // @ts-ignore
          pool_record.categories[index][1].value =
            // @ts-ignore
            (pool_record.categories[index][1].value * originalPoolsCount) /
            (originalPoolsCount + 1);
        }
      }
      portfolioComposition[record.category_from_request][poolID] = pool_record;
    }
    setPortfolioComposition(portfolioComposition);
  };

  function _getOrCreate(obj: { [key: string]: any }, key: string) {
    if (!obj[key]) {
      obj[key] = {};
    }
    return obj[key];
  }

  return (
    <BasePage>
      <div style={divBetterPools}>
        <center>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Better Pools Search Engine
          </h1>
        </center>
        <div className="mt-2">
          <p className="text-xl text-gray-400">
            Tokens in Current Portfolio: {uniqueTokens.size}
          </p>
          <div>
            {Array.from(uniqueTokens).map((token: unknown, index) => (
              <Image
                key={index}
                // @ts-ignore
                src={`/tokenPictures/${token.replace(/[()]/g, "")}.webp`}
                alt={token as string}
                className="inline-block"
                height={20}
                width={20}
              />
            ))}
          </div>
        </div>
        <RebalanceChart
          rebalanceSuggestions={[]}
          netWorth={100}
          windowWidth={200}
          showCategory={false}
          mode="portfolioComposer"
          portfolioComposition={Object.values(portfolioCompositionForReRender)}
        />
        <Button
          type="primary"
          onClick={() =>
            requestAnimationFrame(() => {
              // JSON.parse(JSON.stringify means deep copy
              setPortfolioCompositionForReRender(
                JSON.parse(JSON.stringify(portfolioComposition)),
              );
            })
          }
        >
          Visualize
        </Button>
        <>
          {Object.values(queriesForAllWeather).map((categoryMetaData) => {
            return (
              <div key={categoryMetaData.category}>
                {" "}
                {/* Make sure to provide a unique key for each item */}
                <h2 className="my-2 text-xl font-bold">
                  {categoryMetaData.wording}
                </h2>
                {categoryMetaData.state === null ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "15rem",
                    }}
                  >
                    <Spin size="large" />
                  </div>
                ) : unexpandable[categoryMetaData.category] === true ? (
                  <>
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr className="bg-emerald-400">
                          <th
                            scope="col"
                            className="relative px-7 sm:w-12 sm:px-6"
                          ></th>
                          {basicColumns.map((column, index) => (
                            <th
                              key={index}
                              className={`px-3 py-3.5 text-left text-sm font-semibold text-black ${
                                index > 0 ? "hidden " : ""
                              }sm:table-cell`}
                            >
                              {index == 0 ? (
                                <span className="sm:hidden">Pool</span>
                              ) : (
                                <span className="hidden sm:block">
                                  {column.title}
                                </span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {categoryMetaData.state.map((item, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-black-900">
                            <td className="relative px-7 sm:w-12 sm:px-6">
                              <input
                                type="checkbox"
                                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                onChange={(e) =>
                                  e.target.checked
                                    ? onSelectCallback(item.data[rowIndex], true)
                                    : null
                                }
                              />
                            </td>
                            {basicColumns.map((column, colIndex) => (
                              <>
                                {column.title === "Chain" && (
                                  <td
                                    key={colIndex}
                                    className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 sm:table-cell"
                                  >
                                    <div className="hidden sm:block">
                                      <Image
                                        src={
                                          // @ts-ignore
                                          column.content(item[column.key])
                                          // @ts-ignore
                                            .chainImg
                                        }
                                        alt={
                                          // @ts-ignore
                                          column.content(item[column.key])
                                          // @ts-ignore
                                            .chainAlt
                                        }
                                        height={20}
                                        width={20}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 sm:hidden">
                                      {tableRowMobile.map((title, index) => {
                                        const column = basicColumns.find(
                                          (column) => column.title === title,
                                        );
                                        if (!column) return null;
                                        return (
                                          <>
                                            {column.title === "Tokens" && (
                                              <div className="col-span-2">
                                                <div className="flex items-center">
                                                  {
                                                    // @ts-ignore
                                                    column
                                          // @ts-ignore
                                                      .content(item[column.key])
                                                      // @ts-ignore
                                                      .map((item, index) => (
                                                        <Image
                                                          src={`/tokenPictures/${item.replace(
                                                            /[()]/g,
                                                            "",
                                                          )}.webp`}
                                                          key={item}
                                                          alt={item}
                                                          height={20}
                                                          width={20}
                                                        />
                                                      ))
                                                  }
                                                  <p className="text-white text-xl font-medium px-2">
                                                    {// @ts-ignore
                                                      column.content(item[column.key]).length > 1 ?
                                                      // @ts-ignore
                                                      column.content(item[column.key]).join("-")
                                                      // @ts-ignore
                                                      : column.content(item[column.key])
                                                    }
                                                  </p>
                                                </div>
                                              </div>
                                            )}
                                            {column.title === "TVL" && (
                                              <div className="col-span-1">
                                                <p className="text-gray-400 text-sm font-medium">
                                                  TVL
                                                </p>
                                                <span
                                                  className={
                                                    // @ts-ignore
                                                    column.content(
                                                      // @ts-ignore
                                                      item[column.key],
                                                    // @ts-ignore
                                                    ).danger == 1
                                                      ? "block px-2 text-red-400"
                                                      : "block px-2 text-white"
                                                  }
                                                >
                                                  {
                                                    // @ts-ignore
                                                    column.content(
                                                      // @ts-ignore
                                                      item[column.key],
                                                    // @ts-ignore
                                                    ).tvlUsdCount
                                                  }
                                                  M
                                                </span>
                                              </div>
                                            )}
                                            {column.title === "APR" && (
                                              <div className="col-span-1">
                                                <p className="text-gray-400 text-sm font-medium">
                                                  APR
                                                </p>
                                                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                  {
                                                    // @ts-ignore
                                                    column.content(
                                                    // @ts-ignore
                                                      item[column.key],
                                                    // @ts-ignore
                                                    ).aprVal
                                                  }
                                                  %
                                                </span>
                                                {
                                                  // @ts-ignore
                                                  column.content(
                                                  // @ts-ignore
                                                    item[column.key],
                                                  // @ts-ignore
                                                  ).aprPredicted === "Down" ? (
                                                    <ArrowDownOutlined className="text-red-400 px-2" />
                                                  ) : (
                                                    <ArrowUpOutlined className="text-green-400 px-2" />
                                                  )
                                                }
                                              </div>
                                            )}
                                            {column.title === "Chain" && (
                                              <div className="col-span-1">
                                                <p className="text-gray-400 text-sm font-medium">
                                                  Chain
                                                </p>
                                                <Image
                                                  src={
                                                    // @ts-ignore
                                                    column.content(
                                                    // @ts-ignore
                                                      item[column.key],
                                                    // @ts-ignore
                                                    ).chainImg
                                                  }
                                                  alt={
                                                    // @ts-ignore
                                                    column.content(
                                                    // @ts-ignore
                                                      item[column.key],
                                                    // @ts-ignore
                                                    ).chainAlt
                                                  }
                                                  height={20}
                                                  width={20}
                                                />
                                              </div>
                                            )}
                                            {column.title === "Pool" && (
                                              <div className="col-span-1">
                                                <p className="text-gray-400 text-sm font-medium">
                                                  DEX
                                                </p>
                                                {// @ts-ignore
                                                  column.content(item[column.key]).paidUser || rowIndex > 0 ? (
                                                  <div>
                                                    <button
                                                      type="button"
                                                      className="text-sm text-gray-400 shadow-sm hover:text-white"
                                                      onClick={() => {
                                                        handleLinkButton(
                                                          // @ts-ignore
                                                          column.content(item[column.key]).protocolLink
                                                        );
                                                        setLinkModalOpen(true);
                                                      }}
                                                    >
                                                      <Image
                                                        src={// @ts-ignore
                                                          `/projectPictures/${column.content(item[column.key]).pool.name}.webp`
                                                        }
                                                        alt={// @ts-ignore
                                                          column.content(item[column.key]).pool.name
                                                        }
                                                        className="me-2"
                                                        height={20}
                                                        width={20}
                                                      />
                                                    </button>
                                                    <div className="relative group">
                                                      <span className="text-white pe-2">
                                                        {// @ts-ignore
                                                          column.content(item[column.key]).pool.name
                                                        }
                                                      </span>
                                                      <span className="hidden group-hover:inline-block bg-black/50 px-2 py-2 text-sm text-white border rounded-md absolute bottom-full left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
                                                        {// @ts-ignore
                                                          "pool ID: " + column.content(item[column.key]).pool.poolID
                                                        }
                                                      </span>
                                                      {// @ts-ignore
                                                        column.content(item[column.key]).pool.meta ? (
                                                        <p className="text-gray-400 text-xs pe-2">
                                                          {// @ts-ignore
                                                            column.content(item[column.key]).pool.meta
                                                          }
                                                        </p>
                                                      ) : null}
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-400 px-2.5 py-1.5 text-sm"
                                                  >
                                                    <UnlockOutlined className="-ml-0.5 h-5 w-5" />
                                                    30 Days Free Trial
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </>
                                        );
                                      })}
                                    </div>
                                  </td>
                                )}
                                {column.title === "Pool" && (
                                  <td
                                    key={colIndex}
                                    className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell"
                                  >
                                    {// @ts-ignore
                                      column.content(item[column.key]).paidUser || rowIndex > 0 ? (
                                      <div className="flex items-center">
                                        <Image
                                          src={// @ts-ignore
                                            `/projectPictures/${column.content(item[column.key]).pool.name}.webp`
                                          }
                                          alt={// @ts-ignore
                                            column.content(item[column.key]).pool.name
                                          }
                                          className="me-2"
                                          height={20}
                                          width={20}
                                        />
                                        <div className="relative group">
                                          <span className="text-white pe-2">
                                            {// @ts-ignore
                                              column.content(item[column.key]).pool.name
                                            }
                                          </span>
                                          <span className="hidden group-hover:inline-block bg-black/50 px-2 py-2 text-sm text-white border rounded-md absolute bottom-full left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
                                            {// @ts-ignore
                                              "pool ID: " + column.content(item[column.key]).pool.poolID
                                            }
                                          </span>
                                          {// @ts-ignore
                                            column.content(item[column.key]).pool.meta ?
                                            (
                                              <span className="text-gray-400 text-xs pe-2">
                                                {// @ts-ignore
                                                  column.content(item[column.key]).pool.meta
                                                }
                                              </span>
                                            ) 
                                            : ""
                                          }
                                        </div>
                                        <button
                                          type="button"
                                          className="text-sm text-gray-400 shadow-sm hover:text-white"
                                          onClick={() => {
                                            handleLinkButton(
                                              // @ts-ignore
                                              column.content(item[column.key]).protocolLink
                                            );
                                            setLinkModalOpen(true);
                                          }}
                                        >
                                          <ExportOutlined />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-400 px-2.5 py-1.5 text-sm"
                                      >
                                        <UnlockOutlined className="-ml-0.5 h-5 w-5" />
                                        30 Days Free Trial
                                      </button>
                                    )}
                                  </td>
                                )}
                                {column.title === "Tokens" && (
                                  <td
                                    key={colIndex}
                                    className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell"
                                  >
                                    <div className="flex items-center">
                                      {
                                        // @ts-ignore
                                        column
                                        // @ts-ignore
                                          .content(item[column.key])
                                          // @ts-ignore
                                          .map((item, index) => (
                                            <Image
                                              src={`/tokenPictures/${item.replace(
                                                /[()]/g,
                                                "",
                                              )}.webp`}
                                              key={item}
                                              alt={item}
                                              height={20}
                                              width={20}
                                            />
                                          ))
                                      }
                                      <span className="text-white px-2">
                                        {// @ts-ignore
                                          column.content(item[column.key]).length > 1 ?
                                          // @ts-ignore
                                          column.content(item[column.key]).join("-")
                                          // @ts-ignore
                                          : column.content(item[column.key])
                                        }
                                      </span>
                                    </div>
                                  </td>
                                )}
                                {column.title === "TVL" && (
                                  <td
                                    key={colIndex}
                                    className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell"
                                  >
                                    <span
                                      className={
                                        // @ts-ignore
                                        column.content(item[column.key])
                                        // @ts-ignore
                                          .danger == 1
                                          ? "px-2 text-red-400"
                                          : "px-2 text-white"
                                      }
                                    >
                                      {
                                        // @ts-ignore
                                        column.content(item[column.key])
                                        // @ts-ignore
                                          .tvlUsdCount
                                      }
                                      M
                                    </span>
                                  </td>
                                )}
                                {column.title === "APR" && (
                                  <td
                                    key={colIndex}
                                    className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell"
                                  >
                                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                      {// @ts-ignore
                                        column.content(item[column.key]).aprVal
                                      }%
                                    </span>
                                    {
                                      // @ts-ignore
                                      column.content(item[column.key])
                                    // @ts-ignore
                                        .aprPredicted === "Down" ? (
                                        <ArrowDownOutlined className="text-red-400 px-2" />
                                      ) : (
                                        <ArrowUpOutlined className="text-green-400 px-2" />
                                      )
                                    }
                                  </td>
                                )}
                              </>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <>
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr className="bg-emerald-400">
                          <th></th>
                          {expandableColumns.map((column, index) => (
                            <th
                              key={index}
                              className="px-3 py-3.5 text-left text-sm font-semibold text-black"
                            >
                              {column.title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {categoryMetaData.state.map((item, rowIndex) => (
                          <>
                            <tr
                              key={rowIndex}
                              className="hover:bg-black-900 cursor-pointer"
                              onClick={
                                // @ts-ignore
                                () => toggleExpand(item.tokens)
                              }
                            >
                              <td>
                                <PlusCircleOutlined />
                              </td>
                              {expandableColumns.map((column, colIndex) => (
                                <>
                                  {column.title === "Tokens" && (
                                    <td
                                      key={colIndex}
                                      className="whitespace-nowrap px-3 py-4 text-sm text-gray-300"
                                    >
                                      <div className="flex items-center">
                                        {
                                          // @ts-ignore
                                          column
                                          // @ts-ignore
                                            .content(item[column.key])
                                            .map(
                                              (item: string, index: number) => (
                                                <Image
                                                  src={`/tokenPictures/${item.replace(
                                                    /[()]/g,
                                                    "",
                                                  )}.webp`}
                                                  key={item}
                                                  alt={item}
                                                  height={20}
                                                  width={20}
                                                />
                                              ),
                                            )
                                        }
                                        <span className="text-white px-2">
                                          {
                                            // @ts-ignore
                                            column.content(item[column.ket])
                                              .length > 1
                                              ? // @ts-ignore
                                                column
                                                // @ts-ignore
                                                  .content(item[column.key])
                                                  .join("-")
                                              : // @ts-ignore
                                                column.content(item[column.key])
                                          }
                                        </span>
                                      </div>
                                    </td>
                                  )}
                                  {column.title === "Highest APR" && (
                                    <td
                                      key={colIndex}
                                      className="whitespace-nowrap px-3 py-4 text-sm text-gray-300"
                                    >
                                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                        {
                                          column.content ?
                                          // @ts-ignore
                                          column.content(item[column.key])
                                          // @ts-ignore
                                          : item[column.key]
                                        }%
                                      </span>
                                    </td>
                                  )}
                                </>
                              ))}
                            </tr>
                            <tr>
                              { // @ts-ignore
                                expandedRows[item.tokens] && (
                                  // @ts-ignore
                                  <td colSpan="3">{expandedRowRender(item)}</td>
                                )
                              }
                            </tr>
                          </>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            );
          })}
        </>
      </div>
      <RebalanceChart
        rebalanceSuggestions={[]}
        netWorth={100}
        windowWidth={200}
        showCategory={true}
        mode="portfolioStrategy"
      />
      <TokenDropdownInput
        address={walletAddress}
        onClickCallback={async (
          investmentAmount: number,
          chosenToken: string,
        ) => await investByAAWallet(String(investmentAmount), chosenToken)}
        normalWording="Etherspots"
        loadingWording="Fetching the best route to deposit"
      />
      <LinkModal
        protocolLink={protocolLink}
        linkModalOpen={linkModalOpen}
        setLinkModalOpen={setLinkModalOpen}
      />
    </BasePage>
  );
};

export default Dashboard;
