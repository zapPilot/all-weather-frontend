import React from "react";
import { useEffect } from "react";
import Image from "next/image";
import styles from "../../styles/Home.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useActiveAccount } from "thirdweb/react";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import Link from "next/link";
import {
  fetchDataStart,
  fetchDataSuccess,
  fetchDataFailure,
} from "../../lib/features/apiSlice";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { walletAddressChanged } from "../../lib/features/subscriptionSlice";
import axios from "axios";
import { Spin } from "antd";
import { useRouter } from "next/router";
import Vaults from "../indexes/index.jsx";
import content from "../../config/content";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
export default function ExampleUI() {
  const dispatch = useDispatch();
  const account = useActiveAccount();
  const walletAddress = account?.address.toLocaleLowerCase();
  const { strategyMetadata, strategyLoading, error } = useSelector(
    (state) => state.strategyMetadata,
  );
  const vaults = [
    {
      id: 1,
      portfolioName: "ETH Vault",
      href: "/indexes/indexOverviews/?portfolioName=ETH+Vault",
      imageSrc: "eth",
      imageAlt: "ETH Vault",
      apr: strategyMetadata?.["ETH Vault"]?.portfolioAPR * 100,
      tvl: strategyMetadata?.["ETH Vault"]?.portfolioTVL,
      portfolioHelper: getPortfolioHelper("ETH Vault"),
    },
    {
      id: 2,
      portfolioName: "Stable+ Vault",
      href: `/indexes/indexOverviews/?portfolioName=${encodeURIComponent(
        "Stable+ Vault",
      )}`,
      imageSrc: "usdc",
      imageAlt: "Stable+ Vault",
      apr: strategyMetadata?.["Stable+ Vault"]?.portfolioAPR * 100,
      tvl: strategyMetadata?.["Stable+ Vault"]?.portfolioTVL,
      portfolioHelper: getPortfolioHelper("Stable+ Vault"),
    },
    {
      id: 3,
      portfolioName: "All Weather Vault",
      href: "/indexes/indexOverviews/?portfolioName=All+Weather+Vault",
      imageSrc: "allweather",
      imageAlt: "All Weather Vault",
      apr: strategyMetadata?.["All Weather Vault"]?.portfolioAPR * 100,
      tvl: strategyMetadata?.["All Weather Vault"]?.portfolioTVL,
      portfolioHelper: getPortfolioHelper("All Weather Vault"),
    },
  ];
  const partnershipVaults = [
    {
      id: 3,
      portfolioName: "Metis Vault",
      href: "/indexes/indexOverviews/?portfolioName=Metis+Vault",
      imageSrc: "metis",
      imageAlt: "Metis Vault",
      apr: strategyMetadata?.["Metis Vault"]?.portfolioAPR * 100,
      tvl: strategyMetadata?.["Metis Vault"]?.portfolioTVL,
      portfolioHelper: getPortfolioHelper("Metis Vault"),
    },
    {
      id: 4,
      portfolioName: "Deprecated Vault",
      href: "/indexes/indexOverviews/?portfolioName=Deprecated+Vault",
      imageSrc: "eth",
      imageAlt: "Deprecated Vault",
      apr: strategyMetadata?.["Deprecated Vault"]?.portfolioAPR * 100,
      tvl: strategyMetadata?.["Deprecated Vault"]?.portfolioTVL,
      portfolioHelper: getPortfolioHelper("Deprecated Vault"),
    },
  ];

  const router = useRouter();

  const { query } = router;
  const searchWalletAddress = query.address;

  useEffect(() => {
    if (
      strategyMetadata === undefined ||
      Object.keys(strategyMetadata).length === 0
    ) {
      dispatch(fetchStrategyMetadata());
    }
  }, []);
  useEffect(() => {
    if (!walletAddress) return;
    dispatch(walletAddressChanged({ walletAddress: walletAddress }));
  }, [account]);
  useEffect(() => {
    if (!walletAddress && !searchWalletAddress) return;
    fetchBundlePortfolio(false);
  }, [searchWalletAddress, walletAddress]);
  const fetchBundlePortfolio = (refresh) => {
    dispatch(fetchDataStart());
    axios
      .get(
        `${API_URL}/bundle_portfolio/${
          searchWalletAddress === undefined
            ? walletAddress
            : searchWalletAddress.toLowerCase().trim().replace("/", "")
        }?refresh=${refresh}`,
      )
      .then((response) => response.data)
      .then((data) => dispatch(fetchDataSuccess(data)))
      .catch((error) => dispatch(fetchDataFailure(error.toString())));
  };
  return (
    <div className="px-2 text-white bg-black">
      <div className={"w-full md:w-5/6 md:ml-[8.333333%] " + styles.bgStyle}>
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <center>
            <Image src="/logo.png" alt="logo" width={100} height={100} />
            <h1 className="text-5xl tracking-tight mb-8 text-[#5DFDCB]">
              All Weather Protocol
            </h1>
            <h2 className="heading-subtitle">{content.siteInfo.tagline}</h2>
            <p className="heading-subtitle">{content.siteInfo.subtitle}</p>
            <p className="heading-subtitle">
              Enjoy Up to
              <span
                className="text-5xl tracking-tight text-[#5DFDCB]"
                data-testid="apr"
              >
                {" "}
                {strategyLoading ||
                isNaN(strategyMetadata["Stable+ Vault"]?.portfolioAPR) ? (
                  <Spin />
                ) : (
                  (
                    strategyMetadata["Stable+ Vault"]?.portfolioAPR * 100
                  ).toFixed(2)
                )}
                %{" "}
              </span>
              APR
            </p>
            <Link
              href={`/indexes/indexOverviews?portfolioName=${encodeURIComponent(
                "Stable+ Vault",
              )}`}
            >
              <button
                type="button"
                className="
                  mt-8 px-4 py-2 w-52 h-12
                  font-semibold bg-transparent text-[#5DFDCB]
                  rounded-md border border-solid border-[#5DFDCB] 
                  hover:bg-[#5DFDCB] hover:text-black
                  transition-colors duration-200
                "
                role="invest_now"
              >
                Invest Now!
              </button>
            </Link>
          </center>
        </div>
      </div>
      <div className="w-full md:w-[75%] md:ml-[12.5%] flex justify-center items-center py-8">
        <div className="w-full md:w-2/3 lg:w-1/2">
          <div className="relative w-full aspect-video">
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              src="https://www.youtube.com/embed/wSzdKyqLKdY?si=8nRvJgJ3wYuvS9ew"
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>
      <div className="w-full md:w-[75%] md:ml-[12.5%]">
        <h3 className="text-2xl text-emerald-400 font-semibold md:mb-4 px-4">
          Vaults
        </h3>
        <Vaults vaults={vaults} />
      </div>
      <div className="w-full md:w-[75%] md:ml-[12.5%]">
        <h3 className="text-2xl text-emerald-400 font-semibold md:mb-4 px-4">
          Partnership Vaults
        </h3>
        <Vaults vaults={partnershipVaults} />
      </div>
    </div>
  );
}
