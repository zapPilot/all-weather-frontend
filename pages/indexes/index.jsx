import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { fetchStrategyMetadata } from "../../lib/features/strategyMetadataSlice.js";
import { Spin } from "antd";
import ImageWithFallback from "../basicComponents/ImageWithFallback";

export default function Vaults({ vaults }) {
  const { strategyMetadata: vaultsMetadata } = useSelector(
    (state) => state.strategyMetadata,
  );
  const dispatch = useDispatch();
  const [protocolName, setProtocolName] = useState("");
  
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
        setProtocolName(json.data[1].data[0].pool.name);
      } catch (error) {
        console.log("failed to fetch pool data", error);
      }
    };

    fetchDefaultPools();
  }, []);

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
                  domKey={product.imageSrc}
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
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
