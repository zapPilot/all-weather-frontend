import React, { useState } from "react";
import { Button, Modal, ConfigProvider } from "antd";
import { fetch1InchSwapData } from "./oneInch";
import tokens from "../pages/views/components/tokens.json";
import { portfolioVaults } from "./oneInch";
import axios from "axios";
import Image from "next/image";
const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const tokensAndCoinmarketcapIdsFromDropdownOptions = {
  usdc: 3408,
  usdt: 825,
  "usdc.e": 3408,
  weth: 2396,
  eth: 2396,
  dai: 4943,
  usde: 29470,
  wbtc: 3717,
  eurc: 20641,
  mseth: 2396,
  zuneth: 2396,
  metis: 9640,
};
export const tokensForDropDown = [
  "eth",
  "usdc",
  "usdc.e",
  "usdt",
  "dai",
  // "wbtc",
  "weth",
  "metis",
  // "frax",
  // "wsteth",
  // "usds",
  // "eura",
  // "usd+",
  // "reth",
  // "pendle",
  // "ezeth",
  // "cbeth",
  // "lusd",
  // "susd",
  // "euroe",
  // "axlusdc",
];
export const selectBefore = (handleChange, chainID, selectedToken) => {
  const selectSymbol = selectedToken?.split("-")[0];
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  if (!chainID) {
    // chaindID would be set once the user connects their wallet
    return;
  }
  return (
    <>
      <Button onClick={showModal} role="select-token-button">
        <div className="flex items-center">
          {tokens.props.pageProps.tokenList[String(chainID)]
            ?.filter((option) =>
              tokensForDropDown.some(
                (symbol) =>
                  option.symbol.toLowerCase() === symbol && option.logoURI2,
              ),
            )
            ?.map((option) => {
              if (
                selectSymbol &&
                option.symbol &&
                option.symbol.toLowerCase() === selectSymbol.toLowerCase()
              ) {
                return (
                  <Image
                    key={option.symbol}
                    src={option.logoURI2}
                    width="20"
                    height="20"
                    alt={option.symbol}
                  />
                );
              }
            })}
          <span className="ms-2">{selectSymbol}</span>
        </div>
      </Button>
      <ConfigProvider
        theme={{
          components: {
            Modal: {
              contentBg: "#1f2937",
              headerBg: "#1f2937",
              titleColor: "#ffffff",
            },
            Button: {
              textHoverBg: "#334155",
            },
          },
          token: {
            colorText: "#ffffff",
            colorFillSecondary: "#334155",
          },
        }}
      >
        <Modal
          title="Supported Tokens"
          open={isModalOpen}
          onCancel={handleCancel}
          footer={null}
          closable={false}
          centered
        >
          {tokens.props.pageProps.tokenList[String(chainID)]
            ?.filter((option) =>
              tokensForDropDown.some(
                (symbol) =>
                  option.symbol.toLowerCase() === symbol && option.logoURI2,
              ),
            )
            ?.map((option) => {
              const keyAndValue = `${option.symbol}-${option.address}-${option.decimals}`;
              return (
                <Button
                  type="text"
                  key={keyAndValue}
                  value={keyAndValue}
                  onClick={() => {
                    handleChange(keyAndValue);
                    handleCancel();
                  }}
                  size="large"
                  className="mb-2"
                  block
                >
                  <div className="flex items-center">
                    <Image
                      src={option.logoURI2}
                      width="24"
                      height="24"
                      alt={option.symbol}
                    />
                    <span className="ms-2">{option.symbol}</span>
                  </div>
                </Button>
              );
            })}
        </Modal>
      </ConfigProvider>
    </>
  );
};

export const getAggregatorData = async (
  chainID,
  amount,
  chosenToken,
  toToken,
  fromAddress,
  slippage,
) => {
  const chosenTokenFor1Inch =
    chosenToken === "0x0000000000000000000000000000000000000000"
      ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      : chosenToken;
  if (chosenTokenFor1Inch.toLowerCase() === toToken.toLowerCase()) {
    return {
      apolloxAggregatorData: "",
    };
  }
  const [apolloxAggregatorData] = await Promise.all([
    fetch1InchSwapData(
      chainID,
      chosenTokenFor1Inch,
      toToken,
      amount,
      fromAddress,
      slippage,
    ),
  ]);
  return {
    apolloxAggregatorData: apolloxAggregatorData.tx.data,
  };
};

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function refreshTVLData(messageApi) {
  await axios
    .get(
      `${API_URL}/addresses?addresses=${portfolioVaults.join(
        "+",
      )}&refresh=True&worksheet=bsc_contract`,
    )
    .catch((error) =>
      messageApi.error({
        content: `${error.shortMessage}. Please report this issue to our Discord.`,
        duration: 5,
      }),
    );
}

export const chainIDToName = (chainID) => {
  switch (chainID) {
    case 56:
      return "bsc";
    case 42161:
      return "arb";
    case 1:
      return "eth";
    default:
      throw new Error("Unsupported Chain");
  }
};
