import { InfoCircleOutlined } from "@ant-design/icons";
import { Spin, Popover } from "antd";
import Image from "next/image";
import ImageWithFallback from "../basicComponents/ImageWithFallback";
const categoryMapping = {
  long_term_bond: "ETH",
  intermediate_term_bond: "Zero Coupon Bonds",
  commodities: "Non-Financial Applications",
  gold: "Stablecoins",
  large_cap_us_stocks: "Large-Cap Tokens",
  small_cap_us_stocks: "Small-Cap Tokens",
  non_us_developed_market_stocks: "Non-EVM Large-Cap Tokens",
  non_us_emerging_market_stocks: "Non-EVM Small-Cap Tokens",
};

// Separate protocol row component
const ProtocolRow = ({ protocol, portfolioName, portfolioApr }) => (
  <tr className="">
    <td className="max-w-0 px-0 py-4">
      <div className="text-white flex items-center gap-3">
        <ProtocolInfo protocol={protocol} />
      </div>
    </td>
    <td className="max-w-0 px-0 py-4">
      <div className="text-white flex items-center gap-3">
        <TokenDisplay protocol={protocol} />
      </div>
    </td>
    <td className="py-4 pl-8 pr-0 text-right tabular-nums text-white">
      {(protocol.weight * 100).toFixed(0)}%
    </td>
    <td className="py-4 pl-8 pr-0 text-right tabular-nums text-white">
      <APRDisplay
        apr={
          portfolioApr?.[portfolioName]?.[protocol.interface.uniqueId()]?.apr
        }
      />
    </td>
  </tr>
);

// Token display component
const TokenDisplay = ({ protocol }) => {
  return (
    <div className="flex flex-col gap-1 max-w-[200px]">
      <div className="relative flex items-center">
        {protocol.interface.symbolList.map((symbol, idx) => {
          const uniqueTokenKey = `${protocol.interface.uniqueId()}-${protocol.interface.symbolList.join(
            "",
          )}-${symbol}-${idx}`;
          return (
            <ImageWithFallback
              key={uniqueTokenKey}
              className="me-1 rounded-full"
              domKey={uniqueTokenKey}
              token={symbol.replace("(bridged)", "")}
              height={20}
              width={20}
            />
          );
        })}
      </div>
      <p className="font-medium truncate text-xs text-gray-400 text-left">
        {protocol.interface.symbolList.join("-")}
      </p>
    </div>
  );
};

// Protocol info component
const ProtocolInfo = ({ protocol }) => (
  <div className="ms-2 truncate relative">
    <div className="flex items-center gap-4">
      <div className="relative inline-flex items-center">
        <Image
          src={`/projectPictures/${protocol.interface.protocolName}.webp`}
          alt={protocol.interface.protocolName}
          height={35}
          width={35}
          className="rounded-full"
        />
        <div className="absolute -bottom-1 -right-1">
          <Image
            src={`/chainPicturesWebp/${protocol.interface.chain}.webp`}
            alt={protocol.interface.chain}
            height={20}
            width={20}
            className="rounded-full"
          />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-base font-medium text-white">
          {protocol.interface.protocolName}
        </span>
        <span className="text-sm text-gray-500">
          {protocol.interface.chain}
        </span>
      </div>
    </div>
  </div>
);

// APR display component
const APRDisplay = ({ apr }) => (
  <span>{isNaN(apr * 100) ? <Spin /> : `${(apr * 100 || 0).toFixed(2)}%`}</span>
);

// Category table component
const CategoryTable = ({
  protocolArray,
  portfolioName,
  portfolioApr,
  yieldContent,
}) => (
  <table className="w-full whitespace-nowrap text-left text-sm leading-6">
    <thead className="border-b border-gray-200">
      <tr>
        <th scope="col" className="py-3 font-medium text-gray-400">
          <span>Protocol</span>
        </th>
        <th scope="col" className="py-3 font-medium text-gray-400">
          <span>Tokens</span>
        </th>
        <th
          scope="col"
          width={50}
          className="py-3 text-right font-medium text-gray-400"
        >
          <span>Weight</span>
        </th>
        <th
          scope="col"
          width={50}
          className="py-3 text-right font-medium text-gray-400"
        >
          <span>APR</span>
          <Popover
            content={yieldContent}
            title="Source of Yield"
            trigger="hover"
          >
            <InfoCircleOutlined className="ms-2 text-gray-500" />
          </Popover>
        </th>
      </tr>
    </thead>
    <tbody>
      {protocolArray
        .sort((a, b) => sortProtocols(a, b, portfolioName, portfolioApr))
        .map((protocol, index) =>
          protocol.weight > 0 ? (
            <ProtocolRow
              key={index}
              protocol={protocol}
              portfolioName={portfolioName}
              portfolioApr={portfolioApr}
            />
          ) : null,
        )}
    </tbody>
  </table>
);

// Sort helper function
const sortProtocols = (a, b, portfolioName, portfolioApr) => {
  if (a.weight === 0 && b.weight !== 0) return 1;
  if (a.weight !== 0 && b.weight === 0) return -1;

  // First sort by weight
  if (a.weight !== b.weight) return b.weight - a.weight;

  // If weights are equal, then sort by APR
  const aprA =
    portfolioApr?.[portfolioName]?.[a.interface.uniqueId()]?.apr || 0;
  const aprB =
    portfolioApr?.[portfolioName]?.[b.interface.uniqueId()]?.apr || 0;
  return aprB - aprA;
};

export default function PortfolioComposition({
  portfolioName,
  portfolioHelper,
  portfolioApr,
  loading,
  usdBalanceLoading,
  lockUpPeriod,
  yieldContent,
}) {
  // Add this helper function to organize protocols by category
  const organizeByCategory = () => {
    const categoryMap = new Map();

    Object.entries(portfolioHelper.strategy).forEach(
      ([category, protocols]) => {
        Object.entries(protocols).forEach(([chain, protocolArray]) => {
          if (!categoryMap.has(category)) {
            categoryMap.set(category, new Map());
          }
          categoryMap.get(category).set(chain, protocolArray);
        });
      },
    );

    return categoryMap;
  };
  return (
    <div className="lg:col-span-2 lg:row-span-1">
      <div className="shadow-sm border border-white/50 p-6 rounded-lg bg-white/5 backdrop-blur-sm">
        <h2 className="text-xl font-semibold leading-6 text-white mb-6">
          {portfolioName} Constituents
        </h2>
        {portfolioHelper &&
          Array.from(organizeByCategory()).map(
            ([category, chainProtocolMap]) => {
              const allProtocols = Array.from(chainProtocolMap.values()).flat();

              const hasActiveProtocols = allProtocols.some(
                (protocol) => protocol.weight > 0,
              );

              if (!hasActiveProtocols) return null;

              return (
                <>
                  <div className="mt-8 first:mt-0 mb-4">
                    <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      {categoryMapping[category]}
                    </h3>
                  </div>
                  <div className="mt-2">
                    <CategoryTable
                      protocolArray={allProtocols}
                      portfolioName={portfolioName}
                      portfolioApr={portfolioApr}
                      yieldContent={yieldContent}
                    />
                  </div>
                </>
              );
            },
          )}

        <div className="mt-8 pt-4 border-t border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-gray-400" role="lockUpPeriod">
                Lock-up Period
              </span>{" "}
              {usdBalanceLoading === true ? (
                <Spin />
              ) : typeof lockUpPeriod === "number" ? (
                lockUpPeriod === 0 ? (
                  <span className="text-green-500 ml-2">Unlocked</span>
                ) : (
                  <span className="text-red-500 ml-2">
                    {Math.floor(lockUpPeriod / 86400)} d{" "}
                    {Math.ceil((lockUpPeriod % 86400) / 3600)
                      ? Math.ceil((lockUpPeriod % 86400) / 3600) + "h"
                      : null}
                  </span>
                )
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Avg. APR</span>
              <span className="text-lg font-semibold text-green-500">
                {loading ? (
                  <Spin />
                ) : (
                  `${(
                    (portfolioApr?.[portfolioName]?.portfolioAPR || 0) * 100
                  ).toFixed(2)}%`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
