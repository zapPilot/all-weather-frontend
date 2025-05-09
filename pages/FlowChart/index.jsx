import dynamic from "next/dynamic";
import React, { useState, useRef } from "react";
import Image from "next/image";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { Spin } from "antd";

// Dynamically import FlowDirectionGraph with SSR disabled
const FlowDirectionGraph = dynamic(
  () => import("@ant-design/graphs").then((mod) => mod.FlowDirectionGraph),
  { ssr: false },
);

const NodeContent = ({ nodeData, displayTradingLoss }) => {
  const formatTradingLoss = (value) => {
    if (value === null && nodeData.id === stepName) return <Spin />;
    if (value === null) return null;

    const absValue = Math.abs(value);
    const isNegative = value < 0;
    const formattedValue = absValue < 0.01 ? "< $0.01" : `$${absValue.toFixed(2)}`;

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
          loading="lazy"
          quality={50}
          unoptimized={true}
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
          loading="lazy"
          quality={50}
          unoptimized={true}
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
        loading="lazy"
        quality={50}
        unoptimized={true}
      />
      {nodeData.name}
    </>
  );

  if (nodeData.name.startsWith("Swap")) {
    return renderSwapNode();
  }
  if (nodeData.name.startsWith("Deposit") || nodeData.name.startsWith("Withdraw")) {
    return renderDepositWithdrawNode(
      nodeData.name.startsWith("Deposit") ? "Deposit" : "Withdraw"
    );
  }
  return renderDefaultNode();
};

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
      setCompletedSteps((prev) => {
        const newSet = new Set([...prev, stepName, prevStepNameRef.current]);
        console.log(`[Node ${nodeData.id}] Updated completed steps:`, Array.from(newSet));
        return newSet;
      });
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
  }, [stepName, nodeData.id, tradingLoss, setCompletedSteps, completedSteps, currentChain]);

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

  return (
    <div
      key={`flow-node-${nodeData.id}`}
      className={`user-flow-node bg-white duration-300 flex items-center justify-center ${
        isActiveOrCompleted ? "opacity-100" : "opacity-40"
      }`}
    >
      <div className="user-flow-node-name flex items-center">
        <NodeContent nodeData={nodeData} displayTradingLoss={displayTradingLoss} />
      </div>
    </div>
  );
};

const getGraphOptions = (data, stepName, tradingLoss, completedSteps, setCompletedSteps, currentChain) => ({
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
          ? "l(0) 0:#F04864 0.5:#7EC2F3 1:#1890FF"
          : "l(0) 0:#1890FF 0.5:#7EC2F3 1:#F04864",
      labelText: () => "",
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
});

export default function DemoFlowDirectionGraph({
  data,
  stepName,
  tradingLoss,
  currentChain,
}) {
  console.log("DemoFlowDirectionGraph data", data);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const options = getGraphOptions(
    data,
    stepName,
    tradingLoss,
    completedSteps,
    setCompletedSteps,
    currentChain
  );

  return <FlowDirectionGraph {...options} />;
}
