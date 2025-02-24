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
      const aggregatedTokens = Object.entries(APRData ?? {}).reduce((acc, [_, value]) => {
        const symbol = value.symbol;
        if (!acc[symbol]) {
          acc[symbol] = {
            symbol,
            usdDenominatedValue: 0,
          };
        }
        acc[symbol].usdDenominatedValue += value.usdDenominatedValue || 0;
        return acc;
      }, {});

      return Object.values(aggregatedTokens)
        .sort((a, b) => b.usdDenominatedValue - a.usdDenominatedValue)
        .map((value) => {
          return (
            <div key={value.symbol}>
              <Image
                src={`/tokenPictures/${value.symbol}.webp`}
                width={20}
                height={20}
                alt={value.symbol}
              />
              {value.symbol} ${value.usdDenominatedValue.toFixed(2)}{" "}
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
      title="Data Breakdown"
      trigger="hover"
    >
      <InfoCircleOutlined
        aria-hidden="true"
        className="h-6 w-5 text-gray-500 ms-1"
      />
    </Popover>
  );
};
export default APRComposition;
