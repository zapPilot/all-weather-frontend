import BasePage from "../basePage.tsx";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { Spin } from "antd";

export default function Vaults() {
  const { strategyMetadata: vaultsMetadata } = useSelector(
    (state) => state.strategyMetadata,
  );
  const dispatch = useDispatch();

  const vaults = [
    {
      id: 1,
      portfolioName: "Stablecoin Vault",
      href: "/indexes/indexOverviews/?portfolioName=Stablecoin+Vault",
      imageSrc: "/indexFunds/stablecoinVault.png",
      imageAlt: "Stablecoin Vault",
      apr:
        (vaultsMetadata?.["Stablecoin Vault"]?.portfolioAPR * 100).toFixed(2) +
        "%",
      tvl: "upcoming",
    },
    {
      id: 1,
      portfolioName: "ETH Vault",
      href: "/indexes/indexOverviews/?portfolioName=ETH+Vault",
      imageSrc: "/tokenPictures/eth.webp",
      imageAlt: "ETH Vault",
      apr: (vaultsMetadata?.["ETH Vault"]?.portfolioAPR * 100).toFixed(2) + "%",
      tvl: "upcoming",
    },
  ];
  useEffect(() => {
    if (Object.keys(vaultsMetadata).length === 0) {
      dispatch(fetchStrategyMetadata());
    }
  }, []);

  return (
    <BasePage>
      <div className="px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          List of Index Funds
        </h1>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {vaults.map((product) => (
            <div
              key={product.id}
              className="bg-gray-800 p-4 border rounded border-transparent hover:border-emerald-400"
            >
              <Link
                href={{
                  pathname: "/indexes/indexOverviews",
                  query: { portfolioName: product.portfolioName },
                }}
              >
                <div className="flex justify-between">
                  <h2 className="text-xl text-white">
                    {product.portfolioName}
                  </h2>
                  <img
                    alt={product.imageAlt}
                    src={product.imageSrc}
                    className="w-24"
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 divide-x divide-gray-400">
                  <div className="text-center">
                    <p className="text-gray-400">TVL</p>
                    <p className="text-3xl text-white">{product.tvl}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">APR</p>
                    <p className="text-3xl text-emerald-400" role="apr">
                      {product.apr ? product.apr : <Spin />}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </BasePage>
  );
}
