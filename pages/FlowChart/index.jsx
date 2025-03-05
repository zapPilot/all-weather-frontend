import dynamic from "next/dynamic";
import React, { useState, useRef } from "react";
import Image from "next/image";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { Spin } from "antd";

const UserFlowNode = ({
  nodeData,
  stepName,
  tradingLoss,
  completedSteps,
  setCompletedSteps,
  currentChain,
}) => {
  const prevStepNameRef = useRef(stepName);
  const tradingLossRef = useRef(null);
  const [nodeState, setNodeState] = useState({
    isActive: false,
  });
  React.useEffect(() => {
    if (stepName !== prevStepNameRef.current) {
      setCompletedSteps((prev) => new Set([...prev, prevStepNameRef.current]));
      prevStepNameRef.current = stepName;

      if (nodeData.id === stepName) {
        tradingLossRef.current = tradingLoss;
        setNodeState({
          isActive: true,
        });
      } else if (completedSteps?.has(nodeData.id)) {
        setNodeState((prev) => ({
          ...prev,
          isActive: false,
        }));
      } else {
        tradingLossRef.current = null;
        setNodeState((prev) => ({
          ...prev,
          isActive: false,
        }));
      }
    } else if (
      nodeData.id === stepName &&
      tradingLoss !== tradingLossRef.current
    ) {
      tradingLossRef.current = tradingLoss;
    }
  }, [stepName, nodeData.id, tradingLoss, setCompletedSteps, completedSteps]);

  const isActiveOrCompleted =
    nodeState.isActive ||
    nodeData.id === stepName ||
    completedSteps?.has(nodeData.id) ||
    currentChain.toLowerCase().replace(" one", "").replace(" mainnet", "") === nodeData.id;

  const displayTradingLoss = completedSteps?.has(nodeData.id)
    ? tradingLossRef.current
    : nodeData.id === stepName
    ? tradingLoss
    : null;

  const formatTradingLoss = (value) => {
    if (value === null && nodeData.id === stepName) return <Spin />;
    if (value === null) return null;

    const absValue = Math.abs(value);
    const isNegative = value < 0;

    const formattedValue =
      absValue < 0.01 ? "< $0.01" : `$${absValue.toFixed(2)}`;
    return (
      <span className={`text-sm ${isNegative ? "" : "text-green-500"}`}>
        {formattedValue}
      </span>
    );
  };

  const renderSwapNode = () => (
    <>
      <div className="flex items-center">
        <Image
          src="/projectPictures/1inch-network.webp"
          alt="1inch"
          className="inline-block"
          height={20}
          width={20}
        />
        <span className="mx-1">Swap</span>
        <ImageWithFallback
          token={nodeData.name.split(" to ")[0].replace("Swap ", "")}
          height={20}
          width={20}
        />
        <span className="mx-1">→</span>
        <ImageWithFallback
          token={nodeData.name.split(" to ")[1]}
          height={20}
          width={20}
        />
      </div>
      {displayTradingLoss !== null && (
        <div>{formatTradingLoss(displayTradingLoss)}</div>
      )}
    </>
  );

  const renderDepositWithdrawNode = (actionName) => (
    <>
      <div className="flex items-center">
        <Image
          src={nodeData.imgSrc}
          alt={nodeData.name}
          className="inline-block"
          height={20}
          width={20}
        />
        <span className="mx-1">{actionName}</span>
        {nodeData.name
          .replace(actionName, "")
          .split("-")
          .map((token, idx) => (
            <ImageWithFallback
              key={idx}
              token={token}
              height={20}
              width={20}
              className="me-1"
            />
          ))}
      </div>
      {displayTradingLoss !== null && (
        <div>{formatTradingLoss(displayTradingLoss)}</div>
      )}
    </>
  );

  const renderDefaultNode = () => (
    <>
      <Image
        src={nodeData.imgSrc}
        alt={nodeData.name}
        className="inline-block me-1"
        height={20}
        width={20}
      />
      {nodeData.name}
    </>
  );
  return (
    <div
      key={`flow-node-${nodeData.id}`}
      className={`user-flow-node bg-white duration-300 flex items-center justify-center ${
        isActiveOrCompleted ? "opacity-100" : "opacity-40"
      }`}
    >
      <div className="user-flow-node-name flex items-center">
        {nodeData.name.startsWith("Swap")
          ? renderSwapNode()
          : nodeData.name.startsWith("Deposit") ||
            nodeData.name.startsWith("Withdraw")
          ? renderDepositWithdrawNode(
              nodeData.name.startsWith("Deposit") ? "Deposit" : "Withdraw",
            )
          : renderDefaultNode()}
      </div>
    </div>
  );
};

// Dynamically import FlowDirectionGraph with SSR disabled
const FlowDirectionGraph = dynamic(
  () => import("@ant-design/graphs").then((mod) => mod.FlowDirectionGraph),
  { ssr: false },
);

export default function DemoFlowDirectionGraph({
  data,
  stepName,
  tradingLoss,
  currentChain,
}) {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const options = {
    autoFit: "view",
    data,
    node: {
      style: {
        component: (nodeData) => (
          <UserFlowNode
            nodeData={nodeData}
            stepName={stepName}
            tradingLoss={tradingLoss}
            completedSteps={completedSteps}
            setCompletedSteps={setCompletedSteps}
            currentChain={currentChain}
          />
        ),
        size: [200, 50],
      },
    },
    edge: {
      style: {
        stroke: (d) =>
          d.data.type === "split"
            ? "l(0) 0:#5dfdcb 0.5:#ffffff 1:#5dfdcb"
            : "l(0) 0:#5dfdcb 0.5:#ffffff 1:#5dfdcb",
        labelText: (d) => {
          return "";
        },
        labelBackground: true,
      },
    },
    transforms: (prev) => [
      ...prev,
      {
        type: "map-edge-line-width",
        key: "map-edge-line-width",
        value: (d) => d.data.ratio,
        minValue: 0,
        maxValue: 1,
        minLineWidth: 1,
        maxLineWidth: 16,
      },
    ],
    layout: {
      type: "antv-dagre",
      nodesep: 10,
      ranksep: 5,
    },
  };

  return (
    <>
      <FlowDirectionGraph {...options} />
    </>
  );
}
