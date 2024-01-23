import type { NextPage } from "next";
import BasePage from "./basePage.tsx";
import { Badge, Card } from "antd";
import { useContractRead } from "wagmi";
import { useEffect } from "react";
import { useWindowHeight } from "../utils/chartUtils";
import camelotNFTPositionManager from "../lib/contracts/CamelotNFTPositionManager.json";

interface PositionObj {
  data: any;
}

const LiquidityPoolRangeMonitoring: NextPage = () => {
  const windowHeight = useWindowHeight();
  const divBetterPools = {
    padding: "0 8px",
    minHeight: windowHeight,
    color: "#ffffff",
  };
  const BPS = 1.0001;
  const camelotNftPositionManager =
    "0x00c7f3082833e796a5b3e4bd59f6642ff44dcd15";
  const camelotPositionPendle1: PositionObj = useContractRead({
    address: camelotNftPositionManager,
    abi: camelotNFTPositionManager,
    functionName: "positions",
    args: [47230],
    chainId: 42161,
  });
  const camelotPositionPendle2: PositionObj = useContractRead({
    address: camelotNftPositionManager,
    abi: camelotNFTPositionManager,
    functionName: "positions",
    args: [47232],
    chainId: 42161,
  });
  const camelotPositionLink: PositionObj = useContractRead({
    address: camelotNftPositionManager,
    abi: camelotNFTPositionManager,
    functionName: "positions",
    args: [39409],
    chainId: 42161,
  });
  const NFTPositions = {
    camelotPositionPendle1,
    camelotPositionPendle2,
    camelotPositionLink,
  };

  useEffect(() => {}, []);

  return (
    <BasePage>
      <div style={divBetterPools}>
        <center>
          <h1>Liquidity Pool Range Monitoring Service</h1>
        </center>
        {Object.entries(NFTPositions).map(([name, positionObj], index) => {
          return (
            <Badge.Ribbon text="In Range" color="green">
              <Card title={name} size="small">
                {positionObj.data === undefined ? (
                  <p>loading...</p>
                ) : (
                  <p>
                    Price Range: {Math.pow(BPS, positionObj.data[4]).toFixed(5)}
                    -{Math.pow(BPS, positionObj.data[5]).toFixed(5)}
                  </p>
                )}
              </Card>
            </Badge.Ribbon>
          );
        })}
      </div>
    </BasePage>
  );
};

export default LiquidityPoolRangeMonitoring;
