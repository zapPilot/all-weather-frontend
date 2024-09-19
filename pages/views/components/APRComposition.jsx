import { Popover, Image, Spin } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const APRComposition = ({
  APRData,
  mode,
  currency,
  exchangeRateWithUSD,
  pendingRewardsLoading,
}) => {
  const renderContent = () => {
    if (pendingRewardsLoading === true) {
      return <Spin size="small" />;
    }
    if (mode === "pendingRewards") {
      return Object.entries(APRData).map(([key, value]) => {
        return (
          <div key={key}>
            <Image
              src={`/tokenPictures/${value.symbol}.webp`}
              width={20}
              height={20}
              alt={key}
            />
            {value.symbol} {value.usdDenominatedValue}{" "}
            <span style={{ fontSize: "12px", color: "grey" }}>
              {value.balance.toString() / Math.pow(10, value.decimals)}
            </span>
          </div>
        );
      });
    } else {
      `not implemented ${mode}`;
    }
  };
  return (
    <Popover
      style={{ width: "500px" }}
      content={renderContent()}
      title="Data Breakdown (cannot claim less than $1)"
      trigger="hover"
    >
      <InfoCircleOutlined
        aria-hidden="true"
        className="h-6 w-5 text-gray-500"
      />
    </Popover>
  );
};
export default APRComposition;
