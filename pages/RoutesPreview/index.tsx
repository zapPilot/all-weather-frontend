// @ts-nocheck
// originated from Tailwind UI and Ant Design
// https://tailwindui.com/components/ecommerce/components/shopping-carts
// https://ant.design/components/modal
import { Button, Modal } from "antd";
import React from "react";
import {
  getPortfolioHelper,
  investByAAWallet,
} from "../../utils/thirdwebSmartWallet.ts";
import ChainList from "../../public/chainList.json" assert { type: "json" };
import RebalanceChart from "../views/RebalanceChart";
import { useActiveAccount, useSendBatchTransaction } from "thirdweb/react";

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
  const [loading, setLoading] = React.useState<boolean>(true);
  const account = useActiveAccount();
  const [portfolioHelper, setPortfolioHelper] = React.useState<Object>({
    strategy: {},
  });
  const { mutate: sendBatch } = useSendBatchTransaction();

  React.useEffect(() => {
    async function fetchPoolAPR() {
      const localPortfolioHelper = await getPortfolioHelper(
        portfolioName,
        account,
      );
      setPortfolioHelper(localPortfolioHelper);
    }
    if (account) {
      fetchPoolAPR();
    }
  }, [portfolioName, account]);

  const showLoading = () => {
    setOpen(true);
    setLoading(true);

    // Simple loading mock. You should add cleanup logic in real world.
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  const signTransaction = async (
    investmentAmount: number,
    chosenToken: string,
  ) => {
    console.log(
      "investmentAmount",
      investmentAmount,
      "chosenToken",
      chosenToken,
    );
    if (!chosenToken) {
      alert("Please select a token");
      return;
    }
    if (!account) return;
    const portfolioHelper = await getPortfolioHelper(
      "AllWeatherPortfolio",
      account,
    );
    const txns = await investByAAWallet(
      portfolioHelper,
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
              portfolioComposition={Object.entries(portfolioHelper.strategy)}
              account={account}
              color="black"
            />
          ) : null}
          <form className="mt-12">
            <section aria-labelledby="cart-heading">
              <h2 id="cart-heading" className="sr-only">
                Items in your shopping cart
              </h2>

              <ul
                role="list"
                className="divide-y divide-gray-200 border-b border-t border-gray-200"
              >
                {Object.entries(portfolioHelper.strategy).map(
                  ([category, protocols]) => (
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
                  ),
                )}
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
      <Button type="primary" onClick={showLoading}>
        Zap In
      </Button>
      <Modal open={open} onCancel={() => setOpen(false)} footer={<></>}>
        <ModalContent />
      </Modal>
    </>
  );
};

export default RoutesPreview;
