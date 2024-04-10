import Image from 'next/image';
import {
  UnlockOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
} from "@ant-design/icons";

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
      <Image
        src={`/chainPicturesWebp/${chain}.webp`}
        height={20}
        width={20}
      />
    ),
    content: (chain) => chain,
  },
  pool: {
    title: "Pool",
    dataIndex: "pool",
    key: "pool",
    width: 24,
    render: (pool, _, index) => {
      return index === 0 && subscriptionStatus === false ? (
        <Link href="/subscription" passHref>
          <Button type="primary" icon={<UnlockOutlined />}>
            Unlock
          </Button>
        </Link>
      ) : (
        <div className="flex items-center">
          <Image
            src={`/projectPictures/${pool.name}.webp`}
            alt={pool.name}
            className="me-2"
            height={20}
            width={20}
          />
          <div className="relative group">
            <span className="text-white pe-2"> {pool.name}</span>
            <span class="hidden group-hover:inline-block bg-black/50 px-2 py-2 text-sm text-white border rounded-md absolute bottom-full left-1/2 transform -translate-x-1/2 transition-opacity duration-300">{"pool ID: " + pool.poolID}</span>
            {pool.meta ? (
              <span className="text-gray-400 text-xs pe-2">
                ({pool.meta})
              </span>
            ) : null}
          </div>
          {protocolList.map((protocol) =>
            protocol.slug === pool.name ? (
              <button
                type="button"
                className="text-sm text-gray-400 shadow-sm hover:text-white"
                onClick={() => {
                  handleLinkButton(protocol.url);
                  setLinkModalOpen(true);
                }}
              >
                <ExportOutlined />
              </button>
            ) : null,
          )}
        </div>
      );
    },
    content: (pool, _, index) => {
      const paidUser = subscriptionStatus;
      const protocolLink = protocolList.find(protocol => protocol.slug === pool.name);
      return {
        paidUser: paidUser,
        pool: pool,
        protocolLink: protocolLink ? protocolLink.url : null
      };
    }
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
            />
          ))}
          <span className="text-white px-2">
          {
            // backward compatibility
            Array.isArray(tokens) ? 
            tokens.join("-")
            :tokens
          }
          </span>
        </div>
      );
    },
    content: (tokens) => {
      let newCoins = tokens;
      if (typeof tokens === "string") {
        newCoins = tokens.split("-");
      }
      return tokens
    }
  },
  tvlUsd: {
    title: "TVL",
    key: "tvlUsd",
    dataIndex: "tvlUsd",
    width: 14,
    render: (tvlUsd) => {
      const danger = tvlUsd < 500000 ? true : false;
      return (
        <span
          className={ danger ? "px-2 text-red-400" : "px-2 text-white"}>
          {(tvlUsd / 1e6).toFixed(2)}M
        </span>
      );
    },
    content: (tvlUsd) => {
      const danger = tvlUsd < 500000 ? 1 : 0;
      const tvlUsdCount = (tvlUsd / 1e6).toFixed(2);
      return {
        danger: danger,
        tvlUsdCount: tvlUsdCount,
      }
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
          {
            apr.predictions.predictedClass === "Down" ? (
              <ArrowDownOutlined className="text-red-400 px-2"/>
            ) : (
              <ArrowUpOutlined className="text-green-400 px-2" />
            )
          }
        </div>
      ) : (
        // for backward compatibility
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          {apr}
        </span>
      );
    },
    content: (apr) => {
      const aprVal = apr.value.toFixed(2);
      const aprPredicted = apr.predictions.predictedClass;
      return {
        aprVal: aprVal,
        aprPredicted: aprPredicted,
      }
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
    content: (apr) => apr.value.toFixed(2),
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
