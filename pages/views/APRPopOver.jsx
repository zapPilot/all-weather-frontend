//@ts-nocheck
// All code in this file will be ignored by the TypeScript compiler
import React, { useState, useEffect } from "react";
import { Spin } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import Image from "next/image";
import { ASSET_CONFIG } from "../../config/assetConfig";
const APRPopOver = () => {
  const { data, loading } = useSelector((state) => state.api);
  const [missingPools, setMissingPools] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (loading) return;
    let tmpMissingPools = [];
    for (const pool of Object.values(data?.aggregated_positions ?? {})) {
      if (pool.apr.success === false) {
        tmpMissingPools.push(pool);
      }
    }
    tmpMissingPools.sort((a, b) => b.worth - a.worth);
    setMissingPools(tmpMissingPools);
  }, [data, loading]);

  if (loading)
    return (
      <center>
        <Spin size="small" role="aprpopoverloading" />
        Loading...
      </center>
    );

  return (
    <>
      <p
        className="font-bold my-2 cursor-pointer"
        onClick={() => setOpen(!open)}
        role="aprpopover"
        style={{ display: missingPools.length === 0 ? "none" : "block" }}
      >
        Missing APR data for {missingPools.length} Pools
        <WarningOutlined className="text-red-400 ms-2" />
      </p>
      {open && (
        <div className="grid grid-cols-1 gap-4">
          <p>
            Some pool data may be missing. Please allow up to 24 hours for
            customer support to update the information.
          </p>
          {missingPools.map((pool) => {
            const poolJson = JSON.parse(pool.apr.debug);
            return (
              <div className="bg-gray-800 p-2" key={pool.address}>
                <div className="flex mb-1 font-medium">
                  <Image
                    src={ASSET_CONFIG.getAssetPath(
                      `/chainPicturesWebp/${poolJson.mapping_chain}.webp`,
                    )}
                    width={20}
                    height={20}
                    alt={poolJson.mapping_chain}
                    loading="lazy"
                    quality={50}
                    unoptimized={true}
                  />
                  <span className="mx-1">
                    {poolJson.mapping_chain.toUpperCase()}
                  </span>
                  <span>-</span>
                  <Image
                    src={pool.protocol_logo_url}
                    width={20}
                    height={20}
                    alt={poolJson.project_id}
                    className="mx-1"
                    loading="lazy"
                    quality={50}
                    unoptimized={true}
                  />
                  <span>{poolJson.project_id}</span>
                </div>
                <div className="mb-1">
                  <span className="text-gray-400">
                    {poolJson.sorted_debank_optimized_symbol_list
                      ?.join("-")
                      .toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Your pool value</span>
                  <span>${pool.worth.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pool APR</span>
                  <span className="text-green-400">
                    {pool.apr.value * 100}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default APRPopOver;
