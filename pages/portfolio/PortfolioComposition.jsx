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
        <TokenDisplay protocol={protocol} />
        <ProtocolInfo protocol={protocol} />
      </div>
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
const TokenDisplay = ({ protocol }) => (
  <div className="relative flex items-center gap-1">
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
            height={25}
            width={25}
          />
        );
      })}
    </div>
    <div className="absolute -bottom-3 -right-3 sm:-bottom-1 sm:-right-1">
      <Image
        src={`/projectPictures/${protocol.interface.protocolName}.webp`}
        alt={protocol.interface.protocolName}
        height={20}
        width={20}
        className="rounded-full"
      />
    </div>
  </div>
);

// Protocol info component
const ProtocolInfo = ({ protocol }) => (
  <div className="ms-2 truncate">
    <p className="font-semibold truncate ...">
      {protocol.interface.symbolList.join("-")}
    </p>
    <p className="text-gray-500 truncate ...">
      {protocol.interface.protocolName}-{(protocol.weight * 100).toFixed(0)}%
    </p>
  </div>
);

// APR display component
const APRDisplay = ({ apr }) => (
  <span>{isNaN(apr * 100) ? <Spin /> : `${(apr * 100 || 0).toFixed(2)}%`}</span>
);

// Category table component
const CategoryTable = ({
  category,
  protocolArray,
  portfolioName,
  portfolioApr,
  yieldContent,
}) => (
  <table className="w-full whitespace-nowrap text-left text-sm leading-6">
    <thead className="border-b border-gray-200">
      <tr>
        <th scope="col" className="py-3 font-medium text-gray-400">
          <span>{categoryMapping[category]}</span>
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

  const aprA =
    portfolioApr?.[portfolioName]?.[a.interface.uniqueId()]?.apr || 0;
  const aprB =
    portfolioApr?.[portfolioName]?.[b.interface.uniqueId()]?.apr || 0;
  if (aprA !== aprB) return aprB - aprA;

  return b.weight - a.weight;
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
  // Add this helper function to organize protocols by chain and category
  const organizeByChain = () => {
    const chainMap = new Map();

    Object.entries(portfolioHelper.strategy).forEach(
      ([category, protocols]) => {
        Object.entries(protocols).forEach(([chain, protocolArray]) => {
          if (!chainMap.has(chain)) {
            chainMap.set(chain, new Map());
          }
          chainMap.get(chain).set(category, protocolArray);
        });
      },
    );

    return chainMap;
  };
  return (
    <div className="lg:col-span-2 lg:row-span-1">
      <div className="shadow-sm border border-white/50 p-6">
        <h2 className="text-base font-semibold leading-6 text-white">
          {portfolioName} Constituents
        </h2>
        {portfolioHelper &&
          Array.from(organizeByChain()).map(([chain, categoryMap]) => {
            const hasActiveProtocolsInChain = Array.from(categoryMap).some(
              ([_, protocolArray]) =>
                protocolArray.some((protocol) => protocol.weight > 0),
            );

            if (!hasActiveProtocolsInChain) return null;

            return (
              <div key={chain} className="mt-6 first:mt-0">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-semibold">Protocols on</span>
                  <Image
                    src={`/chainPicturesWebp/${chain}.webp`}
                    alt={chain}
                    height={25}
                    width={25}
                    className="rounded-full"
                  />
                </div>
                {Array.from(categoryMap).map(([category, protocolArray]) => {
                  const hasActiveProtocols = protocolArray.some(
                    (protocol) => protocol.weight > 0,
                  );
                  if (!hasActiveProtocols) return null;

                  return (
                    <div key={`${chain}-${category}`} className="mt-4">
                      <CategoryTable
                        category={category}
                        protocolArray={protocolArray}
                        portfolioName={portfolioName}
                        portfolioApr={portfolioApr}
                        yieldContent={yieldContent}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

        <tfoot>
          <tr className="border-t border-gray-200">
            <th scope="row" className="pt-6 font-semibold text-white">
              Avg. APR
            </th>
            <td className="pt-6 font-semibold text-right text-green-500">
              {loading ? (
                <Spin />
              ) : (
                `${(
                  (portfolioApr?.[portfolioName]?.portfolioAPR || 0) * 100
                ).toFixed(2)}%`
              )}
            </td>
          </tr>
        </tfoot>
        <div>
          <span className="text-gray-500" role="lockUpPeriod">
            Lock-up Period
          </span>{" "}
          {usdBalanceLoading === true ? (
            <Spin />
          ) : typeof lockUpPeriod === "number" ? (
            lockUpPeriod === 0 ? (
              <span className="text-green-500">Unlocked</span>
            ) : (
              <span className="text-red-500">
                {Math.floor(lockUpPeriod / 86400)} d{" "}
                {Math.ceil((lockUpPeriod % 86400) / 3600)
                  ? Math.ceil((lockUpPeriod % 86400) / 3600) + "h"
                  : null}
              </span>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
