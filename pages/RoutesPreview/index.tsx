// @ts-nocheck
// originated from Tailwind UI and Ant Design
// https://ant.design/components/modal
// https://tailwindui.com/components/ecommerce/components/shopping-carts
import { Button, Modal, Progress, Radio, ConfigProvider } from "antd";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import React from "react";
import ChainList from "../../public/chainList.json" assert { type: "json" };
import RebalanceChart from "../views/RebalanceChart";
import { useActiveAccount, useSendBatchTransaction } from "thirdweb/react";
import styles from "../../styles/Home.module.css";
import TokenDropdownInput from "../views/TokenDropdownInput.jsx";
import { useSelector } from "react-redux";
import { arbitrum } from "thirdweb/chains";
import CamelotNFTPositionManager from "../../lib/contracts/CamelotNFTPositionManager.json" assert { type: "json" };
import { encodeFunctionData } from "viem";
import Image from "next/image";

interface RoutesPreviewProps {
  portfolioName: string;
}

const RoutesPreview: React.FC<RoutesPreviewProps> = ({ portfolioName }) => {
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
  // TODO(david): this USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831 is for arbitrum. we need a way to get different default address for omnichain product
  const [selectedToken, setSelectedToken] = React.useState(
    "USDC-0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  );
  const [investmentAmount, setInvestmentAmount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [slippage, setSlippage] = React.useState(1);
  // useCallback ensures setSelectedToken has a stable reference
  const handleSetSelectedToken = React.useCallback((token) => {
    setSelectedToken(token);
  }, []);
  const handleSetInvestmentAmount = React.useCallback((amount) => {
    setInvestmentAmount(amount);
  }, []);
  React.useEffect(() => {
    if (strategyMetadata && !loading) {
      portfolioHelper.reuseFetchedDataFromRedux(strategyMetadata);
    }
  }, [strategyMetadata, loading, portfolioHelper]);

  const showLoading = () => {
    setOpen(true);
    setProgress(0);
  };

  const signTransaction = async (
    investmentAmount: number,
    tokenSymbolAndAddress: string,
  ) => {
    if (!tokenSymbolAndAddress) {
      alert("Please select a token");
      return;
    }
    setIsLoading(true);
    if (!account) return;
    portfolioHelper.reuseFetchedDataFromRedux(strategyMetadata);
    const txns = await portfolioHelper.zapIn(
      account,
      Number(investmentAmount),
      tokenSymbolAndAddress,
      (progressPercentage) => setProgress(progressPercentage),
      slippage,
    );
    sendBatch(txns.flat(Infinity), { gasless: true });
    // TODO: use this script to transfer all the NFT from AA to my wallet
    // const nft_ids = [117347, 117349,117064, 117348, 117063];
    // const txsn_ids = nft_ids.map((id) => {
    //   return {
    //     chain: arbitrum,
    //     to: "0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD15",
    //     data: encodeFunctionData({
    //       abi: CamelotNFTPositionManager,
    //       functionName: "safeTransferFrom",
    //       args: ["0x2Cb044bd28c62a5d2841EDc1d3EDb34f1c3CAeA6", "0x7EE54ab0f204bb3A83DF90fDd824D8b4abE93222", id],
    //     }),
    //   }
    // })
    // sendBatch(txsn_ids)
    setIsLoading(false);
  };
  function ModalContent() {
    return (
      <div className="bg-white">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-0">
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Transaction Preview
          </h1>
          <div style={{ textAlign: "left" }}>
            1. Remember to top up some tokens + ETH to your Account Abstract
            Wallet: <span style={{ color: "#4a90e2" }}>{account?.address}</span>
            <br />
            2.{" "}
            <a
              href="https://all-weather.gitbook.io/all-weather-protocol/overview/what-we-do-your-web3-s-and-p500"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4a90e2" }}
            >
              Demo
            </a>
          </div>
          <RebalanceChart
            suggestions={[]}
            netWorth={100}
            showCategory={true}
            mode="portfolioStrategy"
            color="black"
          />
          <form className="mt-12">
            <TokenDropdownInput
              selectedToken={selectedToken}
              setSelectedToken={handleSetSelectedToken}
              investmentAmount={investmentAmount}
              setInvestmentAmount={handleSetInvestmentAmount}
            />
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
                            $
                            {(
                              portfolioHelper.weightMapping[category] *
                              investmentAmount
                            ).toFixed(2)}
                          </p>
                        </div>
                        {Object.entries(protocols).map(
                          ([chain, protocolArray], index) => (
                            <div key={`${chain}-${index}`}>
                              <p className="mt-1 text-sm text-gray-500">
                                {chain}
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
                                    <Image
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
                                        <Image
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
                                      portfolioHelper?.strategyMetadata[
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
              {isLoading ? (
                <Progress
                  percent={progress.toFixed(2)}
                  status={isLoading ? "active" : ""}
                  size={[400, 10]}
                />
              ) : null}
              <div>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-base font-medium text-gray-900">
                      Subtotal
                    </dt>
                    <dd className="ml-4 text-base font-medium text-gray-900">
                      ${Number(investmentAmount)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-1 text-sm text-gray-500">
                  <ConfigProvider
                    theme={{
                      token: {
                        colorPrimary: "#5DFDCB",
                        colorTextLightSolid: "#000000",
                      },
                    }}
                  >
                    Slippage:
                    <Radio.Group
                      value={slippage}
                      buttonStyle="solid"
                      onChange={(e) => setSlippage(e.target.value)}
                    >
                      {[0.5, 1, 3, 5].map((slippage) => (
                        <Radio.Button value={slippage} key={slippage}>
                          {slippage}%
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </ConfigProvider>
                  Service Fee: $0
                </p>
              </div>

              <div className="mt-10">
                <Button
                  type="button"
                  className="w-full rounded-md border border-transparent bg-indigo-600 text-base font-medium text-white"
                  onClick={() => {
                    signTransaction(
                      investmentAmount,
                      selectedToken.toLowerCase(),
                    );
                  }}
                  loading={isLoading}
                >
                  {isLoading ? "Fetching the Best Routes" : "Sign"}
                </Button>
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
