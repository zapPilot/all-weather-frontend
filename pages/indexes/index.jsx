import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { Spin } from "antd";
import ImageWithFallback from "../basicComponents/ImageWithFallback";

// Extract API request configuration
const API_CONFIG = {
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
};

// Memoized Vault Card component
const VaultCard = memo(function VaultCard({ product }) {
  return (
    <div
      key={product.id}
      className="bg-gray-800 p-4 border rounded border-transparent hover:border-emerald-400"
    >
      <Link href={product.href}>
        <div className="flex justify-between">
          <h2 className="text-xl text-white me-2">
            <span>{product.portfolioName}</span>
          </h2>
          <ImageWithFallback
            className="h-8 w-auto rounded-full"
            domKey={product.imageSrc}
            token={product.imageSrc.replace("(bridged)", "")}
            height={20}
            width={20}
            loading="lazy"
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
              {isNaN(product.apr) ? <Spin /> : `${product.apr.toFixed(2)}%`}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
});

VaultCard.displayName = "VaultCard";

const Vaults = memo(function Vaults({ vaults }) {
  const { strategyMetadata: vaultsMetadata } = useSelector(
    (state) => state.strategyMetadata,
  );
  const dispatch = useDispatch();
  const [protocolName, setProtocolName] = useState("");

  // Memoize fetch function
  const fetchDefaultPools = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/all_weather_pools`,
        API_CONFIG,
      );
      const json = await response.json();
      setProtocolName(json.data[1].data[0].pool.name);
    } catch (error) {
      console.error("failed to fetch pool data", error);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(vaultsMetadata).length === 0) {
      dispatch(fetchStrategyMetadata());
    }
  }, [dispatch, vaultsMetadata]);

  useEffect(() => {
    fetchDefaultPools();
  }, [fetchDefaultPools]);

  return (
    <div className="px-4 py-8">
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {vaults?.map((product) => (
          <VaultCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
});

Vaults.displayName = "Vaults";

export default Vaults;
