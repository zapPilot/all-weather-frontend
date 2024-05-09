//@ts-nocheck
// All code in this file will be ignored by the TypeScript compiler
import type { NextPage } from "next";
import Image from "next/image";
import { Spin, Button } from "antd";
import { useWindowHeight } from "../utils/chartUtils.js";
import { investByAAWallet } from "../utils/thirdwebSmartWallet.js";
import {
  getBasicColumnsForSuggestionsTable,
  getExpandableColumnsForSuggestionsTable,
  columnMapping,
} from "../utils/tableExpansionUtils";
import { useState, useEffect } from "react";
import RebalanceChart from "./views/RebalanceChart";
import TokenDropdownInput from "./views/TokenDropdownInput.jsx";
import LinkModal from "./views/components/LinkModal";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { walletAddressChanged } from "../lib/features/subscriptionSlice";
import TableComponent, { ExpandTableComponent } from "./views/PoolsTable";
import { useWindowWidth } from "../utils/chartUtils";

import { useActiveAccount, useSendBatchTransaction } from "thirdweb/react";
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
  const account = useActiveAccount();
  const walletAddress = account?.address;

  const windowHeight = useWindowHeight();
  const divBetterPools = {
    padding: "0 8px",
    minHeight: windowHeight,
    color: "#ffffff",
  };
  const [protocolList, setProtocolList] = useState([]);
  const [protocolLink, setProtocolLink] = useState("");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const dispatch = useDispatch();
  const subscriptionStatus = useSelector(
    (state) => state.subscriptionStatus.subscriptionStatus,
  );

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
  const { mutate: sendBatch } = useSendBatchTransaction();

  const [portfolioComposition, setPortfolioComposition] = useState<{
    [key: string]: any;
  }>({});
  const [portfolioCompositionForReRender, setPortfolioCompositionForReRender] =
    useState<{
      [key: string]: any;
    }>({});

  const defaultTopN = 3;
  const biggerTopN = 7;
  const queriesForAllWeather: queriesObj[] = [
    {
      wording: "Long Term Bond (40%)",
      category: "long_term_bond",
      setStateMethod: setLongTermBond,
      state: longTermBond,
      setUniqueQueryTokens: setLongTermBondFilterDict,
      uniqueQueryTokens: longTermBondFilterDict,
      unexpandable: unexpandable.long_term_bond,
      setUnexpandable: updateState,
      chain_blacklist: ["cardano", "fantom", "ethereum"],
      topN: defaultTopN,
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
      topN: defaultTopN,
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
      chain_blacklist: ["cardano", "fantom"],
      topN: defaultTopN,
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
      chain_blacklist: ["cardano", "fantom", "ethereum", "multiversx"],
      topN: defaultTopN,
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
      topN: defaultTopN,
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
      topN: defaultTopN,
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
      topN: defaultTopN,
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
      topN: defaultTopN,
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
      chain_whitelist: ["linea", "scroll"],
      topN: biggerTopN,
    },
  ];

  const uniqueTokens = new Set();
  queriesForAllWeather.forEach((item) => {
    // @ts-ignore
    item.uniqueQueryTokens.forEach((query: string) => {
      uniqueTokens.add(query);
    });
  });

  useEffect(() => {
    if (!walletAddress) return;
    dispatch(walletAddressChanged({ walletAddress: walletAddress }));
  }, [account]);

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
                top_n: categoryMetaData.topN,
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

    fetchProtocolList();
  }, []);

  const windowWidth = useWindowWidth();

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
      <TableComponent
        column={columns}
        columnData={records}
        onSelectCallback={onSelectCallback}
        handleLinkButton={handleLinkButton}
        setLinkModalOpen={setLinkModalOpen}
        webView={windowWidth > 768 ? true : false}
      />
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
  const handleScroll = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };
  function _getOrCreate(obj: { [key: string]: any }, key: string) {
    if (!obj[key]) {
      obj[key] = {};
    }
    return obj[key];
  }

  return (
    <>
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
        <div role="portfolio_composer">
          <RebalanceChart
            suggestions={[]}
            netWorth={100}
            windowWidth={200}
            showCategory={false}
            mode="portfolioComposer"
            portfolioComposition={Object.values(
              portfolioCompositionForReRender,
            )}
            account={account}
          />
        </div>
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
              <div
                key={categoryMetaData.category}
                id={categoryMetaData.category}
              >
                {" "}
                {/* Make sure to provide a unique key for each item */}
                <h2 className="my-2 text-xl font-bold">
                  <a
                    href={`#${categoryMetaData.category}`}
                    onClick={() => handleScroll(categoryMetaData.category)}
                  >
                    {categoryMetaData.wording}
                  </a>
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
                    <Spin size="large" role="spin" />
                  </div>
                ) : unexpandable[categoryMetaData.category] === true ? (
                  <TableComponent
                    column={basicColumns}
                    columnData={categoryMetaData.state}
                    onSelectCallback={onSelectCallback}
                    handleLinkButton={handleLinkButton}
                    setLinkModalOpen={setLinkModalOpen}
                    webView={windowWidth > 768 ? true : false}
                  />
                ) : (
                  <ExpandTableComponent
                    column={expandableColumns}
                    columnData={categoryMetaData.state}
                    expandedRowRender={expandedRowRender}
                    webView={windowWidth > 768 ? true : false}
                  />
                )}
              </div>
            );
          })}
        </>
      </div>
      <TokenDropdownInput
        onClickCallback={async (
          investmentAmount: number,
          chosenToken: string,
          account: any,
        ) => {
          const txns = await investByAAWallet(
            String(investmentAmount),
            chosenToken,
            account,
          );
          console.log("txns", txns);
          sendBatch(txns[0][0]);
        }}
        normalWording="Etherspots"
        loadingWording="Fetching the best route to deposit"
        account={account}
      />
      <LinkModal
        protocolLink={protocolLink}
        linkModalOpen={linkModalOpen}
        setLinkModalOpen={setLinkModalOpen}
      />
    </>
  );
};

export default Dashboard;
