// @ts-nocheck
// originated from Tailwind UI and Ant Design
// https://ant.design/components/modal
// https://tailwindui.com/components/ecommerce/components/shopping-carts
import { Button, Modal } from "antd";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import React from "react";
import ChainList from "../../public/chainList.json" assert { type: "json" };
import RebalanceChart from "../views/RebalanceChart";
import { useActiveAccount, useSendBatchTransaction } from "thirdweb/react";
import styles from "../../styles/Home.module.css";
import TokenDropdownInput from "../views/TokenDropdownInput.jsx";
import { useSelector } from "react-redux";

interface RoutesPreviewProps {
  portfolioName: string;
  investmentAmount: number;
  chosenToken: string;
}

const RoutesPreview: React.FC<RoutesPreviewProps> = ({
  portfolioName,
  investmentAmount,
  chosenToken,
}) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const account = useActiveAccount();
  const { mutate: sendBatch } = useSendBatchTransaction();
  const [isHover, setIsHover] = React.useState(false);
  const handleMouseEnter = () => {
    setIsHover(true);
  };
  const handleMouseLeave = () => {
    setIsHover(false);
  };
  const { strategyMetadata, loading, error } = useSelector(
    (state) => state.strategyMetadata,
  );
  const portfolioHelper = React.useMemo(
    () => getPortfolioHelper(portfolioName ?? "AllWeatherPortfolio"),
    [portfolioName],
  );

  React.useEffect(() => {
    if (strategyMetadata && !loading) {
      portfolioHelper.setStrategyMetadata(strategyMetadata);
    }
  }, [strategyMetadata, loading, portfolioHelper]);

  const showLoading = () => {
    setOpen(true);
  };

  const signTransaction = async (
    investmentAmount: number,
    chosenToken: string,
  ) => {
    if (!chosenToken) {
      alert("Please select a token");
      return;
    }
    if (!account) return;
    portfolioHelper.setStrategyMetadata(strategyMetadata);
    const txns = await portfolioHelper.diversify(
      account,
      String(investmentAmount),
      chosenToken,
    );
    sendBatch(txns.flat(Infinity));
  };
  function ModalContent() {
    return (
      <div className="bg-white">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-0">
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Transaction Preview
          </h1>
          {account ? (
            <RebalanceChart
              suggestions={[]}
              netWorth={100}
              showCategory={true}
              mode="portfolioStrategy"
              portfolioComposition={Object.entries(
                portfolioHelper.getStrategyData(
                  "0x0000000000000000000000000000000000000000",
                ),
              )}
              account={account}
              color="black"
            />
          ) : null}
          <form className="mt-12">
            <TokenDropdownInput />
            <section aria-labelledby="cart-heading">
              <ul
                role="list"
                className="divide-y divide-gray-200 border-b border-t border-gray-200"
              >
                {Object.entries(
                  portfolioHelper.getStrategyData(
                    "0x0000000000000000000000000000000000000000",
                  ),
                ).map(([category, protocols]) => (
                  <li key={category} className="flex py-6">
                    <div className="ml-4 flex flex-1 flex-col sm:ml-6">
                      <div>
                        <div className="flex justify-between">
                          <h4 className="text-sm">
                            <a className="font-medium text-gray-700 hover:text-gray-800">
                              {category}:{" "}
                              {portfolioHelper.weightMapping[category] * 100}%
                            </a>
                          </h4>
                          <p className="ml-4 text-sm font-medium text-gray-900">
                            $100
                          </p>
                        </div>
                        {Object.entries(protocols).map(
                          ([chain, protocolArray], index) => (
                            <div key={`${chain}-${index}`}>
                              <p className="mt-1 text-sm text-gray-500">
                                {ChainList.filter(
                                  (chainMetadata) =>
                                    chainMetadata.shortName === chain,
                                )[0]?.name || "Unknown Chain"}
                              </p>
                              {protocolArray.map(
                                (
                                  protocol: {
                                    interface: Object;
                                    weight: number;
                                  },
                                  index: number,
                                ) => (
                                  <p
                                    className="mt-1 text-sm text-gray-500 flex items-center"
                                    key={`${protocol.interface.constructor.protocolName}-${index}`}
                                  >
                                    <img
                                      src={`/projectPictures/${protocol.interface.constructor.protocolName}.webp`}
                                      alt={
                                        protocol.interface.constructor
                                          .protocolName
                                      }
                                      height={25}
                                      width={25}
                                    />
                                    {
                                      protocol.interface.constructor
                                        .protocolName
                                    }
                                    &nbsp;
                                    {protocol.interface.symbolList.map(
                                      (symbol: string, index: number) => (
                                        <img
                                          key={`${symbol}-${index}`}
                                          src={`/tokenPictures/${symbol}.webp`}
                                          alt={symbol}
                                          height={20}
                                          width={20}
                                        />
                                      ),
                                    )}
                                    {protocol.interface.symbolList.join("-")}{" "}
                                    APR:{" "}
                                    {(
                                      portfolioHelper.strategyMetadata[
                                        `${chain}/${
                                          protocol.interface.constructor
                                            .protocolName
                                        }:${protocol.interface.symbolList
                                          .sort()
                                          .join("-")}`
                                      ]?.value * 100
                                    ).toFixed(2)}
                                    %
                                  </p>
                                ),
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      {/* <div className="mt-4 flex flex-1 items-end justify-between">
                        <p className="flex items-center space-x-2 text-sm text-gray-700">
                          {product.inStock ? (
                            <CheckIcon
                              className="h-5 w-5 flex-shrink-0 text-green-500"
                              aria-hidden="true"
                            />
                          ) : (
                            <ClockIcon
                              className="h-5 w-5 flex-shrink-0 text-gray-300"
                              aria-hidden="true"
                            />
                          )}

                          <span>
                            {product.inStock
                              ? "In stock"
                              : `Will ship in ${product.leadTime}`}
                          </span>
                        </p>
                        <div className="ml-4">
                          <button
                            type="button"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            <span>Remove</span>
                          </button>
                        </div>
                      </div> */}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Order summary */}
            <section aria-labelledby="summary-heading" className="mt-10">
              <h2 id="summary-heading" className="sr-only">
                Order summary
              </h2>

              <div>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-base font-medium text-gray-900">
                      Subtotal
                      {/* {totalWeight !== 100
                        ? `Something goes wrong, weight should be exacly 100%, ${totalWeight}`
                        : null} */}
                    </dt>
                    <dd className="ml-4 text-base font-medium text-gray-900">
                      $96.00
                    </dd>
                  </div>
                </dl>
                <p className="mt-1 text-sm text-gray-500">
                  Fee: Free for now. Estimated Gas Fee: $0.04
                </p>
              </div>

              <div className="mt-10">
                <button
                  className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                  onClick={() => {
                    signTransaction(investmentAmount, chosenToken);
                  }}
                >
                  Sign
                </button>
              </div>
            </section>
          </form>
        </div>
      </div>
    );
  }
  return (
    <>
      <Button
        type="primary"
        className={styles.btnInvest}
        style={
          isHover
            ? { backgroundColor: "#5DFDCB", color: "#000000" }
            : { backgroundColor: "transparent", color: "#5DFDCB" }
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={showLoading}
        role="invest_now"
      >
        Invest Now!
      </Button>
      <Modal open={open} onCancel={() => setOpen(false)} footer={<></>}>
        <ModalContent />
      </Modal>
    </>
  );
};

export default RoutesPreview;
