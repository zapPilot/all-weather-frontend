//@ts-nocheck
// All code in this file will be ignored by the TypeScript compiler
import type { NextPage } from "next";
import Image from "next/image";
import { Spin, Button } from "antd";
import { useWindowHeight } from "../utils/chartUtils.js";
import Link from "next/link";
import {
  getBasicColumnsForSuggestionsTable,
  getExpandableColumnsForSuggestionsTable,
  columnMapping,
} from "../utils/tableExpansionUtils";
import { useState, useEffect } from "react";
import LinkModal from "./views/components/LinkModal";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { walletAddressChanged } from "../lib/features/subscriptionSlice";
import TableComponent, { ExpandTableComponent } from "./views/PoolsTable";
import { useWindowWidth } from "../utils/chartUtils";
import { useActiveAccount } from "thirdweb/react";
import { ASSET_CONFIG } from "../config/assetConfig";

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
  const [btc, setBtc] = useState<Pools[] | null>(null);

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
  const [btcFilterDict, setBtcFilterDict] = useState([]);

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

  const [portfolioComposition, setPortfolioComposition] = useState<{
    [key: string]: any;
  }>({});
  const [portfolioCompositionForReRender, setPortfolioCompositionForReRender] =
    useState<{
      [key: string]: any;
    }>({});

  const defaultTopN = 5;
  const biggerTopN = 7;
  const queriesForAllWeather: queriesObj[] = [
    {
      img: ASSET_CONFIG.getAssetPath("tokenPictures/eth.webp"),
      wording: "ETH",
      category: "long_term_bond",
      setStateMethod: setLongTermBond,
      state: longTermBond,
      setUniqueQueryTokens: setLongTermBondFilterDict,
      uniqueQueryTokens: longTermBondFilterDict,
      unexpandable: unexpandable.long_term_bond,
      setUnexpandable: updateState,
      chain_blacklist: ["ethereum", "flare", "iota evm"],
      topN: 10,
    },
    {
      img: ASSET_CONFIG.getAssetPath("tokenPictures/usdc.webp"),
      wording: "Stablecoins",
      category: "gold",
      setStateMethod: setGoldData,
      state: goldData,
      setUniqueQueryTokens: setGoldDataFilterDict,
      uniqueQueryTokens: goldDataFilterDict,
      unexpandable: unexpandable.gold,
      setUnexpandable: updateState,
      chain_blacklist: [
        "ethereum",
        "aptos",
        "sui",
        "core",
        "bob",
        "iota evm",
        "polynomial",
        "flare",
        "ton",
        "kava",
        "gravity",
      ],
      topN: 20,
    },
    {
      img: ASSET_CONFIG.getAssetPath("/tokenPictures/btc.webp"),
      wording: "BTC",
      category: "btc",
      setStateMethod: setBtc,
      state: btc,
      setUniqueQueryTokens: setBtcFilterDict,
      uniqueQueryTokens: btcFilterDict,
      unexpandable: unexpandable.btc,
      setUnexpandable: updateState,
      chain_blacklist: ["ethereum"],
      topN: defaultTopN,
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
        console.error("failed to fetch pool data", error);
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

        if (response && response.data) {
          const data = JSON.parse(response.data);
          setProtocolList(data);
        } else {
          console.error("Invalid or no data available from the API");
        }
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
            🔥 Top APR Farming Pools
          </h1>
        </center>
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
                  <Link
                    href={`#${categoryMetaData.category}`}
                    onClick={() => handleScroll(categoryMetaData.category)}
                    className="flex items-center gap-2"
                  >
                    <Image
                      src={ASSET_CONFIG.getAssetPath(categoryMetaData.img)}
                      width={50}
                      height={50}
                      alt={categoryMetaData.wording}
                      loading="lazy"
                      quality={50}
                      unoptimized={true}
                    />
                    {categoryMetaData.wording}
                  </Link>
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
      <LinkModal
        protocolLink={protocolLink}
        linkModalOpen={linkModalOpen}
        setLinkModalOpen={setLinkModalOpen}
      />
    </>
  );
};

export default Dashboard;
