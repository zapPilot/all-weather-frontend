import Link from "next/link";
import Image from "next/image";
import { memo, useMemo, useCallback } from "react";
import {
  UnlockOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import ImageWithFallback from "../pages/basicComponents/ImageWithFallback";
import { Tooltip } from "antd";

// Memoized chain image component
const ChainImage = memo(({ chain }) => (
  <Tooltip placement="top" title={chain}>
    <Image
      src={`/chainPicturesWebp/${chain}.webp`}
      height={20}
      width={20}
      alt={chain}
      loading="lazy"
      quality={50}
      unoptimized={true}
    />
  </Tooltip>
));

ChainImage.displayName = "ChainImage";

// Memoized pool image component
const PoolImage = memo(({ pool }) => (
  <Image
    src={`/projectPictures/${pool.name}.webp`}
    alt={pool.name}
    className="inline-block me-2"
    height={20}
    width={20}
    loading="lazy"
    quality={50}
    unoptimized={true}
  />
));

PoolImage.displayName = "PoolImage";

// Memoized pool name component
const PoolName = memo(({ pool }) => (
  <span className="text-white pe-2">
    {pool.name}
    {pool.meta && <span className="text-gray-400 text-sm">({pool.meta})</span>}
  </span>
));

PoolName.displayName = "PoolName";

// Memoized token list component
const TokenList = memo(({ tokens }) => {
  const newCoins = typeof tokens === "string" ? tokens.split("-") : tokens;

  return (
    <div className="flex items-center">
      {newCoins.map((token, idx) => (
        <ImageWithFallback
          key={idx}
          token={token}
          height={20}
          width={20}
          domKey={idx}
        />
      ))}
      <span className="text-white px-2">
        {Array.isArray(tokens) ? tokens.join("-") : tokens}
      </span>
    </div>
  );
});

TokenList.displayName = "TokenList";

// Memoized APR component
const AprDisplay = memo(({ apr }) => {
  if (!apr.value) {
    return (
      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        {apr}
      </span>
    );
  }

  return (
    <div className="flex">
      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        {apr.value.toFixed(2)}%
      </span>
      {apr.predictions.predictedClass === "Down" ? (
        <ArrowDownOutlined className="text-red-400 px-2" />
      ) : apr.predictions.predictedClass === "Up" ? (
        <ArrowUpOutlined className="text-green-400 px-2" />
      ) : null}
    </div>
  );
});

AprDisplay.displayName = "AprDisplay";

// Memoized TVL component
const TvlDisplay = memo(({ tvlUsd }) => {
  const danger = tvlUsd < 500000;
  return (
    <span className={danger ? "px-2 text-red-400" : "px-2 text-white"}>
      {(tvlUsd / 1e6).toFixed(2)}M
    </span>
  );
});

TvlDisplay.displayName = "TvlDisplay";

// Memoized pool component with protocol link
const PoolWithLink = memo(
  ({ pool, protocolList, handleLinkButton, setLinkModalOpen }) => {
    const matchingProtocol = useMemo(
      () =>
        protocolList.find((protocol) => {
          const poolName = pool.name.split(" ")[0].toLowerCase();
          const protocolSlug = protocol.slug.split(" ")[0].toLowerCase();
          const protocolSlugHyphen = protocol.slug.split("-")[0].toLowerCase();
          const poolNameHyphen = pool.name.split("-")[0].toLowerCase();

          return (
            poolName.includes(protocolSlug) ||
            protocolSlug.includes(poolName) ||
            protocolSlugHyphen.includes(poolName) ||
            poolName.includes(protocolSlugHyphen) ||
            poolNameHyphen.includes(protocolSlug) ||
            protocolSlug.includes(poolNameHyphen)
          );
        }),
      [pool, protocolList],
    );

    const handleClick = useCallback(() => {
      if (matchingProtocol) {
        handleLinkButton(matchingProtocol.url);
        setLinkModalOpen(true);
      }
    }, [matchingProtocol, handleLinkButton, setLinkModalOpen]);

    return (
      <>
        <Tooltip placement="top" title={pool.poolID}>
          <PoolImage pool={pool} />
          <PoolName pool={pool} />
        </Tooltip>
        {matchingProtocol && (
          <button
            type="button"
            className="text-sm text-gray-400 shadow-sm hover:text-white"
            onClick={handleClick}
          >
            <ExportOutlined />
          </button>
        )}
      </>
    );
  },
);

PoolWithLink.displayName = "PoolWithLink";

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
    render: (chain) => <ChainImage chain={chain} />,
  },
  pool: {
    title: "Pool",
    dataIndex: "pool",
    key: "pool",
    width: 24,
    render: (pool, index) => {
      if (index === 0 && !subscriptionStatus) {
        return (
          <Link
            href="/indexes/indexOverviews/?portfolioName=All+Weather+Vault"
            className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-400 px-2.5 py-1.5 text-sm text-black"
          >
            <UnlockOutlined className="-ml-0.5 h-5 w-5" />
            Subscribe weekly report to unlock
          </Link>
        );
      }
      return (
        <PoolWithLink
          pool={pool}
          protocolList={protocolList}
          handleLinkButton={handleLinkButton}
          setLinkModalOpen={setLinkModalOpen}
        />
      );
    },
  },
  tokens: {
    title: "Tokens",
    dataIndex: "tokens",
    key: "tokens",
    width: 24,
    render: (tokens) => <TokenList tokens={tokens} />,
  },
  tvlUsd: {
    title: "TVL",
    key: "tvlUsd",
    dataIndex: "tvlUsd",
    width: 14,
    render: (tvlUsd) => <TvlDisplay tvlUsd={tvlUsd} />,
  },
  apr: {
    title: "APR",
    key: "apr",
    dataIndex: "apr",
    width: 14,
    render: (apr) => <AprDisplay apr={apr} />,
  },
  outerAprColumn: {
    title: "Highest APR",
    key: "apr",
    dataIndex: "apr",
    width: 14,
    render: (apr) => (
      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        {apr.value.toFixed(2)}%
      </span>
    ),
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
