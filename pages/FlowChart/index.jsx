import dynamic from "next/dynamic";
import React from "react";
import Image from "next/image";
import ImageWithFallback from "../basicComponents/ImageWithFallback";

const UserFlowNode = ({ data }) => {
  return (
    <div className="user-flow-node">
      <div style={{ display: "flex", alignItems: "center" }}>
        <Image
          src={data.imgSrc}
          alt={data.name}
          className="inline-block me-2"
          height={20}
          width={20}
        />
      </div>
      <div
        className="user-flow-node-name"
        style={{ display: "flex", alignItems: "center" }}
      >
        {data.name}
        {data.symbolList !== undefined &&
          data.symbolList.map((symbol, idx) => {
            return (
              <ImageWithFallback
                key={idx}
                className="me-1 rounded-full"
                domKey={`${symbol}-${idx}`}
                token={symbol}
                height={25}
                width={25}
              />
            );
          })}
      </div>
    </div>
  );
};

// const transformData = (data) => {
//   const REF_NODE_IDS = ['node-5', 'node-6'];
//   const findNodeById = (id) => data.nodes.find((node) => node.id === id);
//   data.edges.forEach((edge) => {
//     edge.data ||= {};
//     const isSplit = REF_NODE_IDS.includes(edge.source);
//     edge.data.type = isSplit ? 'split' : 'proportion';
//     // edge.data.ratio = edge.measure.value / findNodeById(isSplit ? edge.source : edge.target).measure.value;
//   });
//   return data;
// };

// Dynamically import FlowDirectionGraph with SSR disabled
const FlowDirectionGraph = dynamic(
  () => import("@ant-design/graphs").then((mod) => mod.FlowDirectionGraph),
  { ssr: false },
);

export default function DemoFlowDirectionGraph({ data }) {
  const options = {
    autoFit: "view",
    padding: 120,
    // data: transformData(data),
    data: data,
    node: {
      style: {
        component: (data) => <UserFlowNode data={data} />,
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
