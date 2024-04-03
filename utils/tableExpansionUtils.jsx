import { Tag, Image, Button, Badge, Tooltip } from "antd";
import Link from "next/link";
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
      <Image src={`/chainPicturesWebp/${chain}.webp`} height={20} width={20} />
    ),
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
      let color = tvlUsd < 500000 ? "volcano" : "green";
      return (
        <Tag color={color} key={tvlUsd}>
          {(tvlUsd / 1e6).toFixed(2)}M
        </Tag>
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
        <>
          <Badge
            count={
              apr.predictions.predictedClass === "Down" ? (
                <ArrowDownOutlined style={{ color: "red" }} />
              ) : (
                <ArrowUpOutlined style={{ color: "green" }} />
              )
            }
          >
            <Tag color={color} key={apr.value}>
              {apr.value.toFixed(2)}%
            </Tag>
          </Badge>
        </>
      ) : (
        // for backward compatibility
        <Tag color={color}>{apr}</Tag>
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
