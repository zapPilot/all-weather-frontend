import Image from "next/image";
import Link from "next/link";
import {
  UnlockOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";

export const columnMapping = (
  protocolList,
  handleLinkButton,
  setLinkModalOpen,
  subscriptionStatus,
) => ({
  chain: {
    title: "Chain",
    dataIndex: "chain",
    key: "chain",
    width: 24,
    render: (chain) => (
      <div>
        <Tooltip placement="top" title={chain}>
          <Image
            src={`/chainPicturesWebp/${chain}.webp`}
            height={20}
            width={20}
            alt={chain}
          />
        </Tooltip>
        <Tooltip id={chain} />
      </div>
    ),
  },
  pool: {
    title: "Pool",
    dataIndex: "pool",
    key: "pool",
    width: 24,
    render: (pool, index) => {
      return index === 0 && subscriptionStatus === false ? (
        <Link
          href="/subscription"
          className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-400 px-2.5 py-1.5 text-sm text-black"
        >
          <UnlockOutlined className="-ml-0.5 h-5 w-5" />
          Unlock
        </Link>
      ) : (
        <>
          <Tooltip placement="top" title={pool.poolID}>
            <Image
              src={`/projectPictures/${pool.name}.webp`}
              alt={pool.name}
              className="inline-block me-2"
              height={20}
              width={20}
            />
            <span className="text-white pe-2">
              {pool.name}
              {pool.meta !== null && pool.meta !== "" ? (
                <span className="text-gray-400 text-sm">({pool.meta})</span>
              ) : null}
            </span>
          </Tooltip>
          {protocolList.map((protocol) =>
            protocol.slug === pool.name ? (
              <button
                type="button"
                className="text-sm text-gray-400 shadow-sm hover:text-white"
                onClick={() => {
                  handleLinkButton(protocol.url);
                  setLinkModalOpen(true);
                }}
                key={protocol.slug}
              >
                <ExportOutlined />
              </button>
            ) : null,
          )}
        </>
      );
    },
  },
  tokens: {
    title: "Tokens",
    dataIndex: "tokens",
    key: "tokens",
    width: 24,
    render: (tokens) => {
      let newCoins = tokens;
      if (typeof tokens === "string") {
        newCoins = tokens.split("-");
      }
      return (
        <div className="flex items-center">
          {newCoins.map((token, index) => (
            <Image
              src={`/tokenPictures/${token.replace(/[()]/g, "")}.webp`}
              alt={token}
              height={20}
              width={20}
              key={index}
            />
          ))}
          <span className="text-white px-2">
            {
              // backward compatibility
              Array.isArray(tokens) ? tokens.join("-") : tokens
            }
          </span>
        </div>
      );
    },
  },
  tvlUsd: {
    title: "TVL",
    key: "tvlUsd",
    dataIndex: "tvlUsd",
    width: 14,
    render: (tvlUsd) => {
      const danger = tvlUsd < 500000 ? true : false;
      return (
        <span className={danger ? "px-2 text-red-400" : "px-2 text-white"}>
          {(tvlUsd / 1e6).toFixed(2)}M
        </span>
      );
    },
  },
  apr: {
    title: "APR",
    key: "apr",
    dataIndex: "apr",
    width: 14,
    render: (apr) => {
      let color = "green";
      return apr.value ? (
        <div className="flex">
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            {apr.value.toFixed(2)}%
          </span>
          {apr.predictions.predictedClass === "Down" ? (
            <ArrowDownOutlined className="text-red-400 px-2" />
          ) : (
            <ArrowUpOutlined className="text-green-400 px-2" />
          )}
        </div>
      ) : (
        // for backward compatibility
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          {apr}
        </span>
      );
    },
  },
  outerAprColumn: {
    title: "Highest APR",
    key: "apr",
    dataIndex: "apr",
    width: 14,
    render: (apr) => {
      return (
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          {apr.value.toFixed(2)}%
        </span>
      );
    },
  },
});
export const getExpandableColumnsForSuggestionsTable = () => [
  columnMapping("")["tokens"],
  columnMapping("")["outerAprColumn"],
];

export const getBasicColumnsForSuggestionsTable = (
  protocolList,
  handleLinkButton,
  setLinkModalOpen,
  subscriptionStatus,
) => [
  columnMapping("")["chain"],
  columnMapping(
    protocolList,
    handleLinkButton,
    setLinkModalOpen,
    subscriptionStatus,
  )["pool"],
  columnMapping("")["tokens"],
  columnMapping("")["tvlUsd"],
  columnMapping("")["apr"],
];
