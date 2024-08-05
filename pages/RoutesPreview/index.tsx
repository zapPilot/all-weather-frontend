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
import { ethers } from "ethers";
import permanentPortfolioJson from "../../lib/contracts/PermanentPortfolioLPToken.json" assert { type: "json" };
const PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_RPC_PROVIDER_URL,
);

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
    // const txns = await portfolioHelper.diversify(
    //   account,
    //   Number(investmentAmount),
    //   tokenSymbolAndAddress,
    //   (progressPercentage) => setProgress(progressPercentage),
    //   slippage,
    // );
    // console.log("tokenSymbolAndAddress", tokenSymbolAndAddress);
    // const txns = await portfolioHelper.claim(
    //   account,
    //   tokenSymbolAndAddress,
    //   (progressPercentage) => setProgress(progressPercentage),
    //   slippage,
    // );
    // sendBatch(txns.flat(Infinity));
    // TODO: use this script to transfer all the NFT from AA to my wallet
    // const nft_ids = [117347, 117349,117064, 117348, 117063];
    // for withdraw: '111299', '101730', '101864', '101297', '101856', '101865'
    // const nft_ids = ['101303', '118287', '111287', '101886', '111289', '111296', '107020', '111303', '101879', '101883', '101882', '111295', '111290', '101776', '101890', '111298', '101884', '111300', '111304', '101887', '101888', '111305', '101885', '101728', '111328', '101868', '101723', '111307', '111292', '111327', '111325', '111323', '101855', '101722', '101871', '101863', '101867', '111315', '111318', '107026', '111293', '107025', '110567', '101298', '107024', '111288', '111316', '101881', '101861', '101777', '101860', '111326', '118288', '101866', '111223', '101869', '111314', '111297', '111308', '101305', '101724', '107022', '101870', '111319', '101304', '101729', '101880', '101862', '107021', ]
    const nft_ids = ["101303"];
    const camelotContract = new ethers.Contract(
      "0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD15",
      CamelotNFTPositionManager,
      PROVIDER,
    );
    let txns = [];
    for (const id of nft_ids) {
      const liquidity = (await camelotContract.positions(id)).liquidity;
      console.log("liquidity", liquidity);
      txns.push({
        chain: arbitrum,
        to: "0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD15",
        data: encodeFunctionData({
          abi: CamelotNFTPositionManager,
          functionName: "decreaseLiquidity",
          args: [
            {
              tokenId: id,
              liquidity,
              amount0Min: 1,
              amount1Min: 1,
              deadline: Math.floor(Date.now() / 1000) + 60 * 20,
            },
          ],
        }),
      });
      // const token0Instance = new ethers.Contract(
      //   token0,
      //   permanentPortfolioJson.abi,
      //   PROVIDER,
      // );
      // const token1Instance = new ethers.Contract(
      //   token1,
      //   permanentPortfolioJson.abi,
      //   PROVIDER,
      // );
      // const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      // const decimalsOfToken0 = (await token0Instance.functions.decimals())[0];
      // const txsn_ids = [
      //   {
      //     chain: arbitrum,
      //     to: "0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD15",
      //     data: encodeFunctionData({
      //       abi: CamelotNFTPositionManager,
      //       functionName: "decreaseLiquidity",
      //       args: [id, liquidity, 10000, 10000, deadline]
      //     }),
      //   }
      // ]
    }
    console.log("txns", txns);
    sendBatch(txns);
    // const decimalsOfToken0 = (await token0Instance.functions.decimals())[0];
    // const txsn_ids = nft_ids.map((id) => {
    //   return {
    //     chain: arbitrum,
    //     to: "0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD15",
    //     data: encodeFunctionData({
    //       abi: CamelotNFTPositionManager,
    //       functionName: "decreaseLiquidity",
    //       args: [id, liquidity, 10000, 10000, deadline]
    //     })
    //   }
    // })
    // sendBatch(txsn_ids)
    // setIsLoading(false);
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
        Withdraw
      </Button>

      <Modal open={open} onCancel={() => setOpen(false)} footer={<></>}>
        <ModalContent />
      </Modal>
    </>
  );
};

export default RoutesPreview;
