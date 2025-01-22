import { InfoCircleOutlined } from "@ant-design/icons";
import { Spin, Popover } from "antd";
import Image from "next/image";
import ImageWithFallback from "../basicComponents/ImageWithFallback";

export default function PortfolioComposition({
  portfolioName,
  portfolioHelper,
  portfolioApr,
  loading,
  usdBalanceLoading,
  lockUpPeriod,
  yieldContent,
}) {
  return (
    <div className="lg:col-span-2 lg:row-span-1">
      <div className="shadow-sm border border-white/50 p-6">
        <h2 className="text-base font-semibold leading-6 text-white">
          {portfolioName} Composition
        </h2>
        {portfolioHelper &&
          Object.entries(portfolioHelper.strategy).map(
            ([category, protocols]) =>
              Object.entries(protocols).map(([chain, protocolArray], index) => (
                <div key={`${chain}-${index}`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-semibold">
                      Protocols on
                    </span>
                    <Image
                      src={`/chainPicturesWebp/${chain}.webp`}
                      alt={chain}
                      height={25}
                      width={25}
                      className="rounded-full"
                    />
                  </div>
                  <table className="mt-3 w-full whitespace-nowrap text-left text-sm leading-6">
                    <thead className="border-b border-gray-200 text-white">
                      <tr>
                        <th scope="col" className="py-3 font-semibold">
                          <span>POOL</span>
                        </th>
                        <th
                          scope="col"
                          width={50}
                          className="py-3 text-right font-semibold"
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
                        .sort((a, b) => {
                          // First priority: non-zero weight protocols
                          if (a.weight === 0 && b.weight !== 0) return 1;
                          if (a.weight !== 0 && b.weight === 0) return -1;

                          // Second priority: APR
                          const aprA =
                            portfolioApr?.[portfolioName]?.[
                              a.interface.uniqueId()
                            ]?.apr || 0;
                          const aprB =
                            portfolioApr?.[portfolioName]?.[
                              b.interface.uniqueId()
                            ]?.apr || 0;
                          if (aprA !== aprB) return aprB - aprA;

                          // Third priority: weight
                          return b.weight - a.weight;
                        })
                        .map((protocol, index) => {
                          if (protocol.weight === 0) return null;
                          return (
                            <tr key={index} className="">
                              <td className="max-w-0 px-0 py-4">
                                <div className="text-white flex items-center gap-3">
                                  <div className="relative flex items-center gap-1">
                                    <div className="relative flex items-center">
                                      {protocol.interface.symbolList.map(
                                        (symbol, idx) => {
                                          const uniqueTokenKey = `${protocol.interface.uniqueId()}-${protocol.interface.symbolList.join(
                                            "",
                                          )}-${symbol}-${idx}`;
                                          return (
                                            <ImageWithFallback
                                              key={uniqueTokenKey}
                                              className="me-1 rounded-full"
                                              domKey={uniqueTokenKey}
                                              token={symbol.replace(
                                                "(bridged)",
                                                "",
                                              )}
                                              height={25}
                                              width={25}
                                            />
                                          );
                                        },
                                      )}
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
                                  <div className="ms-2 truncate">
                                    <p className="font-semibold truncate ...">
                                      {protocol.interface.symbolList.join("-")}
                                    </p>
                                    <p className="text-gray-500 truncate ...">
                                      {protocol.interface.protocolName}-
                                      {(protocol.weight * 100).toFixed(0)}%
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 pl-8 pr-0 text-right tabular-nums text-white">
                                <span>
                                  {isNaN(
                                    portfolioApr?.[portfolioName]?.[
                                      protocol.interface.uniqueId()
                                    ]?.apr * 100,
                                  ) ? (
                                    <Spin />
                                  ) : (
                                    `${(
                                      portfolioApr?.[portfolioName]?.[
                                        protocol.interface.uniqueId()
                                      ]?.apr * 100 || 0
                                    ).toFixed(2)}%`
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )),
          )}

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
