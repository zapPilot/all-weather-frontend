import React, { useState } from "react";
import { Button, Modal, ConfigProvider } from "antd";
import { fetchSwapData } from "./oneInch";
import tokens from "../pages/views/components/tokens.json";
import { portfolioVaults } from "./oneInch";
import axios from "axios";
import Image from "next/image";
const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const tokensAndCoinmarketcapIdsFromDropdownOptions = {
  usdc: {
    coinmarketcapApiId: 3408,
  },
  usdt: {
    coinmarketcapApiId: 825,
  },
  "usdc.e": {
    coinmarketcapApiId: 3408,
  },
  weth: {
    coinmarketcapApiId: 2396,
  },
  eth: {
    coinmarketcapApiId: 2396,
  },
  dai: {
    coinmarketcapApiId: 4943,
  },
  usde: {
    coinmarketcapApiId: 29470,
  },
  wbtc: {
    coinmarketcapApiId: 3717,
  },
  eurc: {
    coinmarketcapApiId: 20641,
  },
  bal: {
    coinmarketcapApiId: 5728,
  },
  mseth: {
    geckoterminal: {
      chain: "base",
      address: "0x7Ba6F01772924a82D9626c126347A28299E98c98",
    },
  },
  zuneth: {
    geckoterminal: {
      chain: "arbitrum",
      address: "0x06d65ec13465ac5a4376dc101e1141252c4addf8",
    },
  },
  metis: {
    coinmarketcapApiId: 9640,
  },
  susd: {
    geckoterminal: {
      chain: "arbitrum",
      address: "0xb2f30a7c980f052f02563fb518dcc39e6bf38175",
    },
  },
  msusd: {
    geckoterminal: {
      chain: "base",
      address: "0x526728DBc96689597F85ae4cd716d4f7fCcBAE9d",
    },
  },
  eusd: {
    geckoterminal: {
      chain: "arbitrum",
      address: "0x12275DCB9048680c4Be40942eA4D92c74C63b844",
    },
  },
  gusdc: {
    geckoterminal: {
      chain: "arbitrum",
      address: "0xd3443ee1e91aF28e5FB858Fbd0D72A63bA8046E0",
    },
  },
  dusdc: {
    coinmarketcapApiId: 3408,
  },
  usdx: {
    coinmarketcapApiId: 34060,
  },
  susdx: {
    coinmarketcapApiId: 34088,
  },
  gho: {
    coinmarketcapApiId: 23508,
  },
  gyd: {
    coinmarketcapApiId: 31996,
  },
  wausdcn: {
    geckoterminal: {
      chain: "arbitrum",
      address: "0x7CFaDFD5645B50bE87d546f42699d863648251ad",
    },
  },
  susdz: {
    geckoterminal: {
      chain: "base",
      address: "0xe31ee12bdfdd0573d634124611e85338e2cbf0cf",
    },
  },
  wsteth: {
    coinmarketcapApiId: 12409,
  },
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
    fetchSwapData(
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
