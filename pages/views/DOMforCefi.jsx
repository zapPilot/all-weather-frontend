import { Image, Table, Spin } from "antd";
const DOMforCefi = ({ betterPoolsMetadata }) => {
  const dataSource = [
    {
      key: "1",
      token: <Image src="../tokenPictures/ETH.png" height={28} width={28} />,
      tvl:
        betterPoolsMetadata &&
        betterPoolsMetadata.categorized_positions &&
        betterPoolsMetadata.categorized_positions.long_term_bond ? (
          "$" +
          betterPoolsMetadata.categorized_positions.long_term_bond.sum.toFixed(
            2,
          )
        ) : (
          <Spin size="small" />
        ),
      claimable_rewards:
        betterPoolsMetadata &&
        betterPoolsMetadata.categorized_positions &&
        betterPoolsMetadata.categorized_positions.long_term_bond ? (
          "$" +
          betterPoolsMetadata.categorized_positions.long_term_bond.claimable_rewards.toFixed(
            2,
          )
        ) : (
          <Spin size="small" />
        ),
      roi: "?",
    },
    {
      key: "2",
      token: (
        <>
          <Image src="../tokenPictures/USDT.png" height={28} width={28} />
          <Image src="../tokenPictures/USDC.png" height={28} width={28} />
          <Image src="../tokenPictures/DAI.png" height={28} width={28} />
          <Image src="../tokenPictures/FRAX.png" height={28} width={28} />
        </>
      ),
      tvl:
        betterPoolsMetadata &&
        betterPoolsMetadata.categorized_positions &&
        betterPoolsMetadata.categorized_positions.intermediate_term_bond ? (
          "$" +
          betterPoolsMetadata.categorized_positions.intermediate_term_bond.sum.toFixed(
            2,
          )
        ) : (
          <Spin size="small" />
        ),
      claimable_rewards:
        betterPoolsMetadata &&
        betterPoolsMetadata.categorized_positions &&
        betterPoolsMetadata.categorized_positions.intermediate_term_bond ? (
          "$" +
          betterPoolsMetadata.categorized_positions.intermediate_term_bond.claimable_rewards.toFixed(
            2,
          )
        ) : (
          <Spin size="small" />
        ),
      roi: "?",
    },
  ];

  const columns = [
    {
      title: "Token",
      dataIndex: "token",
      key: "token",
    },
    {
      title: "TVL",
      dataIndex: "tvl",
      key: "tvl",
    },
    {
      title: "Total Claimable Rewards",
      dataIndex: "claimable_rewards",
      key: "claimable_rewards",
    },
    {
      title: "ROI",
      dataIndex: "roi",
      key: "roi",
    },
  ];
  return <Table dataSource={dataSource} columns={columns} pagination={false} />;
};

export default DOMforCefi;
