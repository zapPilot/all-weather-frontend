import { Tag, Image, Button, Badge, Tooltip } from "antd";
import {
  UnlockOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
} from "@ant-design/icons";

// TODO: need to implement the paid button
const paidUserWallets = [
  "0x78000b0605E81ea9df54b33f72ebC61B5F5c8077",
  "0x3144b7E3a4518541AEB4ceC7fC7A6Dd82f05Ae8B",
  "0xa1761fc95E8B2A1E99dfdEE816F6D8F4c47e26AE",
  "0x43cd745Bd5FbFc8CfD79ebC855f949abc79a1E0C",
  "0xCa35a10C9622fEBfA889410Efb9B905B26221c37", // Chris
  "0xA1abE1Ee3Bd158CF4468434485c6a0E21A7eE83D", // Adrian
];
export const columnMapping = (
  walletAddress,
  protocolList,
  handleLinkButton,
  setLinkModalOpen,
) => ({
  chain: {
    title: "Chain",
    dataIndex: "chain",
    key: "chain",
    width: 24,
    render: (chain) => (
      <Image src={`/chainPicturesWebp/${chain}.webp`} height={20} width={20} />
    ),
  },
  pool: {
    title: "Pool",
    dataIndex: "pool",
    key: "pool",
    width: 24,
    render: (pool, _, index) => {
      return index === 0 && !paidUserWallets.includes(walletAddress) ? (
        <Button type="primary" icon={<UnlockOutlined />}>
          30 Days Free Trial
        </Button>
      ) : (
        <>
          <Image
            src={`/projectPictures/${pool.name}.webp`}
            alt={pool.name}
            height={20}
            width={20}
          />
          <Tooltip title={"pool ID: " + pool.poolID}>
            <span style={{ color: "#ffffff" }}> {pool.name}</span>
            {pool.meta ? (
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "smaller",
                  opacity: "0.7",
                }}
              >
                ({pool.meta})
              </span>
            ) : null}
          </Tooltip>
          {protocolList.map((protocol) =>
            protocol.slug === pool.name ? (
              <Button
                type="link"
                style={{ color: "#ffffff" }}
                onClick={() => {
                  handleLinkButton(protocol.url);
                  setLinkModalOpen(true);
                }}
              >
                <ExportOutlined />
              </Button>
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
        <div>
          {newCoins.map((token, index) => (
            <Image
              key={index}
              src={`/tokenPictures/${token.replace(/[()]/g, "")}.webp`}
              alt={token}
              height={20}
              width={20}
            />
          ))}
          {
            // backward compatibility
            Array.isArray(tokens) ? (
              <span style={{ color: "#ffffff" }}> {tokens.join("-")}</span>
            ) : (
              <span style={{ color: "#ffffff" }}> {tokens}</span>
            )
          }
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
      const color = tvlUsd < 500000 ?
        "bg-red-400/10 text-red-400 ring-red-400/20"
        : "bg-green-500/10 text-green-400 ring-green-500/20";
      return (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${color}`}>
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
  },
  outerAprColumn: {
    title: "Highest APR",
    key: "apr",
    dataIndex: "apr",
    width: 14,
    render: (apr) => {
      let color = "green";
      return (
        <>
          <Tag color={color} key={apr.value}>
            {apr.value.toFixed(2)}%
          </Tag>
        </>
      );
    },
  },
});
export const getExpandableColumnsForSuggestionsTable = () => [
  columnMapping("")["tokens"],
  columnMapping("")["outerAprColumn"],
];

export const getBasicColumnsForSuggestionsTable = (
  walletAddress,
  protocolList,
  handleLinkButton,
  setLinkModalOpen,
) => [
  columnMapping("")["chain"],
  columnMapping(
    walletAddress,
    protocolList,
    handleLinkButton,
    setLinkModalOpen,
  )["pool"],
  columnMapping("")["tokens"],
  columnMapping("")["tvlUsd"],
  columnMapping("")["apr"],
];
