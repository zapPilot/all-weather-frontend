import dynamic from "next/dynamic";
import React, { useState, useRef } from "react";
import Image from "next/image";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
import { Spin } from "antd";

const UserFlowNode = ({
  data,
  stepName,
  tradingLoss,
  completedSteps,
  setCompletedSteps,
  currentChain,
}) => {
  const prevStepNameRef = useRef(stepName);
  const [nodeState, setNodeState] = useState({
    isActive: false,
    tradingLossValue: null,
  });
  React.useEffect(() => {
    if (stepName !== prevStepNameRef.current) {
      setCompletedSteps((prev) => new Set([...prev, stepName]));
      prevStepNameRef.current = stepName;

      // If this node is the current step, store its trading loss
      if (data.id === stepName) {
        setNodeState({
          isActive: true,
          tradingLossValue: tradingLoss,
        });
      }
    }
  }, [stepName]);

  // Use stored state or calculate current state
  const isActiveOrCompleted =
    nodeState.isActive ||
    data.id === stepName ||
    completedSteps?.has(data.id) ||
    currentChain.toLowerCase().replace(" one", "") === data.id;

  // Use stored trading loss if available, otherwise use current trading loss
  const displayTradingLoss = nodeState.isActive
    ? nodeState.tradingLossValue
    : tradingLoss;

  const formatTradingLoss = (value) => {
    if (!value) return <Spin />;
    const absValue = Math.abs(value);
    const isNegative = value < 0;

    const formattedValue =
      absValue < 0.01 ? "< $0.01" : `$${absValue.toFixed(2)}`;

    return (
      <span className={`${isNegative ? "" : "text-green-500"}`}>
        {formattedValue}
      </span>
    );
  };

  const renderSwapNode = () => (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Image
          src="/projectPictures/1inch-network.webp"
          alt="1inch"
          className="inline-block me-2"
          height={20}
          width={20}
        />
        Swap
        <ImageWithFallback
          token={data.name.split(" to ")[0].replace("Swap ", "")}
          height={20}
          width={20}
          className="me-1"
        />
        <span className="mx-1">→</span>
        <ImageWithFallback
          token={data.name.split(" to ")[1]}
          height={20}
          width={20}
        />
      </div>
      {displayTradingLoss !== 0 && (
        <div>{formatTradingLoss(displayTradingLoss)}</div>
      )}
    </div>
  );

  const renderDepositNode = () => (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Image
          src={data.imgSrc}
          alt={data.name}
          className="inline-block me-2"
          height={20}
          width={20}
        />
        Deposit
        {data.name
          .replace("Deposit ", "")
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
      {displayTradingLoss !== 0 && (
        <div>{formatTradingLoss(displayTradingLoss)}</div>
      )}
    </div>
  );

  const renderDefaultNode = () => (
    <>
      <Image
        src={data.imgSrc}
        alt={data.name}
        className="inline-block me-2"
        height={20}
        width={20}
      />
      {data.name}
    </>
  );
  return (
    <div
      className={`user-flow-node transition-opacity duration-300 ${
        isActiveOrCompleted ? "opacity-100" : "opacity-40"
      }`}
    >
      <div className="flex items-center">
        {data.name.startsWith("Swap")
          ? renderSwapNode()
          : data.name.startsWith("Deposit")
          ? renderDepositNode()
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
    padding: 120,
    data,
    node: {
      style: {
        component: (data) => (
          <UserFlowNode
            data={data}
            stepName={stepName}
            tradingLoss={tradingLoss}
            completedSteps={completedSteps}
            setCompletedSteps={setCompletedSteps}
            currentChain={currentChain}
          />
        ),
        size: [160, 90],
      },
    },
    edge: {
      style: {
        stroke: (d) =>
          d.data.type === "split"
            ? "l(0) 0:#F04864 0.5:#7EC2F3 1:#1890FF"
            : "l(0) 0:#1890FF 0.5:#7EC2F3 1:#F04864",
        labelText: (d) => {
          const { type, ratio } = d.data;
          return "";
          const text = type === "split" ? "分流" : "占比";
          return `${text} ${(Number(ratio) * 100).toFixed(2)}%`;
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
        maxLineWidth: 32,
      },
    ],
    layout: {
      type: "antv-dagre",
      nodesep: -10,
      ranksep: 100,
    },
  };

  return <FlowDirectionGraph {...options} />;
}
