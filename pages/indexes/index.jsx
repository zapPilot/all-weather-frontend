import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { Spin } from "antd";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { useActiveAccount } from "thirdweb/react";
import ImageWithFallback from "../basicComponents/ImageWithFallback";

export default function Vaults() {
  const account = useActiveAccount();
  const { strategyMetadata: vaultsMetadata } = useSelector(
    (state) => state.strategyMetadata,
  );
  const dispatch = useDispatch();
  const [tvl, setTvl] = useState(0);
  const [apr, setApr] = useState(0);
  const [diyToken, setDIYToken] = useState("");
  const [protocolName, setProtocolName] = useState("");
  const [usdBalances, setUsdBalances] = useState({});
  const [earnedDict, setEarnedDict] = useState({});
  const vaults = [
    {
      id: 1,
      portfolioName: "Stablecoin Vault",
      href: "/indexes/indexOverviews/?portfolioName=Stablecoin+Vault",
      imageSrc: "/tokenPictures/usdc.webp",
      imageAlt: "Stablecoin Vault",
      apr: vaultsMetadata?.["Stablecoin Vault"]?.portfolioAPR * 100,
      tvl: vaultsMetadata?.["Stablecoin Vault"]?.portfolioTVL,
      portfolioHelper: getPortfolioHelper("Stablecoin Vault"),
    },
    {
      id: 2,
      portfolioName: "ETH Vault",
      href: "/indexes/indexOverviews/?portfolioName=ETH+Vault",
      imageSrc: "/indexFunds/eth vault.webp",
      imageAlt: "ETH Vault",
      apr: vaultsMetadata?.["ETH Vault"]?.portfolioAPR * 100,
      tvl: vaultsMetadata?.["ETH Vault"]?.portfolioTVL,
      portfolioHelper: getPortfolioHelper("ETH Vault"),
    },
    {
      id: 3,
      portfolioName: "Build Your Own Vault with",
      href: "/vote",
      imageSrc:
        diyToken === ""
          ? "/indexes/indexOverviews/?portfolioName=Stablecoin+Vault"
          : `/tokenPictures/${diyToken}.webp`,
      imageAlt: "Build Your Own Vault",
      apr,
      tvl: (tvl / 1000000).toFixed(2).concat("M"),
    },
  ];

  useEffect(() => {
    if (Object.keys(vaultsMetadata).length === 0) {
      dispatch(fetchStrategyMetadata());
    }
  }, []);
  useEffect(() => {
    const fetchDefaultPools = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/all_weather_pools`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_api_key: "placeholder",
              category: "gold",
              top_n: 1,
              chain_blacklist: ["ethereum"],
            }),
          },
        );
        const json = await response.json();
        setApr(json.data[1].data[0].apr.value);
        setTvl(json.data[1].data[0].tvlUsd);
        setDIYToken(json.data[1].data[0].symbol);
        setProtocolName(json.data[1].data[0].pool.name);
      } catch (error) {
        console.log("failed to fetch pool data", error);
      }
    };

    fetchDefaultPools();
  }, []);
  useEffect(() => {
    if (account?.address === undefined) return;
    async function fetchBalances() {
      let usdBalances = {};
      for (const vault of vaults) {
        if (vault.portfolioName === "Build Your Own Vault with") {
          usdBalances["Build Your Own Vault with"] = "?";
          continue;
        }
        if (vault.portfolioHelper === undefined) continue;
        const [_, usdBalanceDict] = await vault.portfolioHelper.usdBalanceOf(
          account.address,
        );
        usdBalances[vault.portfolioName] = Object.values(usdBalanceDict)
          .reduce((a, b) => a + b, 0)
          .toFixed(2);
      }
      setUsdBalances(usdBalances);
    }
    fetchBalances();
  }, [account, vaults]);

  return (
    <div className="px-4 py-8">
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {vaults.map((product) => (
          <div
            key={product.id}
            className="bg-gray-800 p-4 border rounded border-transparent hover:border-emerald-400"
          >
            <Link href={product.href}>
              <div className="flex justify-between">
                <h2 className="text-xl text-white me-2">
                  <span>{product.portfolioName}</span>
                  {product.portfolioName === "Build Your Own Vault with" &&
                    protocolName !== "" && (
                      <img
                        alt={protocolName}
                        src={`/projectPictures/${protocolName}.webp`}
                        className="h-8 inline-block rounded-full ms-2"
                      />
                    )}
                </h2>
                <ImageWithFallback
                  className="h-8 w-auto rounded-full"
                  key={product.imageSrc}
                  // use usdc instead of usdc(bridged), aka, usdc.e for the image
                  token={product.imageSrc.replace("(bridged)", "")}
                  height={20}
                  width={20}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 divide-x divide-gray-400">
                <div className="text-center">
                  <p className="text-gray-400">TVL</p>
                  <p className="text-3xl text-white">
                    {product.tvl === undefined ? <Spin /> : product.tvl}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">APR</p>
                  <p className="text-3xl text-emerald-400" role="apr">
                    {isNaN(product.apr) === true ? (
                      <Spin />
                    ) : (
                      product.apr.toFixed(2)
                    )}
                    %
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 divide-x divide-gray-400">
                <div className="text-center">
                  <p className="text-gray-400">User Deposits</p>
                  <p className="text-3xl text-white">
                    {usdBalances[product.portfolioName] === undefined ? (
                      <Spin />
                    ) : (
                      `$${usdBalances[product.portfolioName]}`
                    )}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">Earned</p>
                  <p className="text-3xl text-emerald-400" role="apr">
                    $?
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
