import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import { Badge, Card, Image, Spin } from "antd";
import { useEffect, useState } from "react";
import { useWindowHeight } from "../utils/chartUtils";
import { useActiveAccount } from "thirdweb/react";

interface Pool {
  data: {
    pool: { chain: string; adapter_id: string };
    asset_token_list: { symbol: string }[];
  };
  current_price: number;
  in_range: boolean;
  max_price: number;
  min_price: number;
}

const DebankChainToDefillamaMapping: Record<string, string> = {
  arb: "arbitrum",
  op: "optimism",
  eth: "ethereum",
  bsc: "bsc",
};
const DebankProjectIdToDefillamaMapping: Record<string, string> = {
  uniswap3_liquidity: "uniswap-v3",
  camelot_v31_liquidity: "camelot-v3",
};

const LiquidityPoolRangeMonitoring: NextPage = () => {
  const windowHeight = useWindowHeight();
  const divBetterPools = {
    padding: "0 8px",
    minHeight: windowHeight,
    color: "#ffffff",
  };
  const [statusesOfLiquidityPools, setstatusesOfLiquidityPools] = useState({
    data: ["placeholder"],
  });
  const account = useActiveAccount();
  const address = account?.address;

  const renderCardTitle = (pool: Pool) => {
    return (
      <>
        <Image
          src={`/chainPicturesWebp/${
            DebankChainToDefillamaMapping[pool.data.pool.chain] ??
            pool.data.pool.chain
          }.webp`}
          height={20}
          width={20}
        />{" "}
        -
        <Image
          src={`/projectPictures/${
            DebankProjectIdToDefillamaMapping[pool.data.pool.adapter_id] ??
            pool.data.pool.adapter_id
          }.webp`}
          height={20}
          width={20}
        />{" "}
        -
        {pool.data.asset_token_list.map((symbolObj) => (
          <Image
            key={symbolObj.symbol}
            src={`/tokenPictures/${symbolObj.symbol.toLowerCase()}.webp`}
            alt={symbolObj.symbol}
            height={20}
            width={20}
          />
        ))}
      </>
    );
  };

  useEffect(() => {
    const userApiKey = "placeholder";
    async function getPositions() {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/liquidity_pool_ranges?worksheet=${address}&refresh=True`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_api_key: userApiKey,
          }),
        },
      );
      const statuses_of_liquidity_pools = await response.json();
      setstatusesOfLiquidityPools(statuses_of_liquidity_pools);
    }
    getPositions();
  }, []);

  return (
    <BasePage>
      <div style={divBetterPools}>
        <center>
          <h1>Liquidity Pool Range Monitoring Service</h1>
        </center>

        {statusesOfLiquidityPools.data[0] === "placeholder" ? (
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
        ) : statusesOfLiquidityPools.data.length === 0 ? (
          <center>
            <p>You do not have any Uniswap V3, Camelot positions</p>
          </center>
        ) : (
          // @ts-ignore
          statusesOfLiquidityPools.data.map((pool: Pool, index) => {
            return (
              <Badge.Ribbon
                text={pool.in_range === true ? "In Range" : "Out of Range"}
                color={pool.in_range === true ? "green" : "red"}
                key={index}
              >
                <Card title={renderCardTitle(pool)} size="small" key={index}>
                  <p>
                    Price Range: {pool.min_price.toFixed(5)}-
                    {pool.max_price.toFixed(5)}, Current Price:{" "}
                    {pool.current_price.toFixed(5)}
                  </p>
                </Card>
              </Badge.Ribbon>
            );
          })
        )}
      </div>
    </BasePage>
  );
};

export default LiquidityPoolRangeMonitoring;
