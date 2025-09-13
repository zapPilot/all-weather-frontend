import React, { useState } from "react";
import { Button, Modal, ConfigProvider } from "antd";
import tokens from "../pages/views/components/slim_tokens.json";
import { portfolioVaults } from "./oneInch";
import axios from "axios";
import Image from "next/image";
const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const tokensAndCoinmarketcapIdsFromDropdownOptions = {
  usdc: {
    coinmarketcapApiId: 3408,
    vaults: ["all"],
  },
  usdt: {
    coinmarketcapApiId: 825,
    vaults: ["all"],
  },
  "usdc.e": {
    coinmarketcapApiId: 3408,
    vaults: ["all"],
  },
  weth: {
    coinmarketcapApiId: 2396,
    vaults: ["all"],
  },
  eth: {
    coinmarketcapApiId: 2396,
    vaults: ["all"],
  },
  dai: {
    coinmarketcapApiId: 4943,
    vaults: ["Stable+ Vault", "Index 500 Vault", "Index 500+ Vault"],
  },
  usde: {
    coinmarketcapApiId: 29470,
    vaults: ["all"],
  },
  wbtc: {
    coinmarketcapApiId: 3717,
    vaults: ["BTC Vault"],
  },
  eurc: {
    coinmarketcapApiId: 20641,
    vaults: [
      "Stable+ Vault",
      "Moonwell Vault",
      "Index 500 Vault",
      "Index 500+ Vault",
    ],
  },
  bal: {
    coinmarketcapApiId: 5728,
    vaults: ["Stable+ Vault", "Index 500 Vault", "Index 500+ Vault"],
  },
  mseth: {
    geckoterminal: {
      chain: "base",
      address: "0x7Ba6F01772924a82D9626c126347A28299E98c98",
    },
    vaults: ["ETH Vault", "Index 500 Vault", "Index 500+ Vault"],
  },
  zuneth: {
    coinmarketcapApiId: 2396,
    vaults: ["ETH Vault"],
  },
  metis: {
    coinmarketcapApiId: 9640,
    vaults: ["Metis Vault"],
  },
  susd: {
    geckoterminal: {
      chain: "arbitrum",
      address: "0xb2f30a7c980f052f02563fb518dcc39e6bf38175",
    },
    vaults: [
      "Stable+ Vault",
      "Convex Stablecoin Vault",
      "Index 500 Vault",
      "Index 500+ Vault",
    ],
  },
  msusd: {
    geckoterminal: {
      chain: "base",
      address: "0x526728DBc96689597F85ae4cd716d4f7fCcBAE9d",
    },
    vaults: [
      "Stable+ Vault",
      "Aerodrome Vault",
      "Index 500 Vault",
      "Index 500+ Vault",
      "Velodrome Vault",
    ],
  },
  eusd: {
    geckoterminal: {
      chain: "arbitrum",
      address: "0x12275DCB9048680c4Be40942eA4D92c74C63b844",
    },
    vaults: ["Stable+ Vault", "Index 500 Vault", "Index 500+ Vault"],
  },
  gusdc: {
    geckoterminal: {
      chain: "arbitrum",
      address: "0xd3443ee1e91aF28e5FB858Fbd0D72A63bA8046E0",
    },
    vaults: [
      "Stable+ Vault",
      "Equilibria Vault",
      "Index 500 Vault",
      "Index 500+ Vault",
    ],
  },
  dusdc: {
    coinmarketcapApiId: 3408,
    vaults: ["Stable+ Vault", "Index 500 Vault", "Index 500+ Vault"],
  },
  usdx: {
    coinmarketcapApiId: 34060,
    vaults: [
      "Stable+ Vault",
      "Convex Stablecoin Vault",
      "Index 500 Vault",
      "Index 500+ Vault",
    ],
  },
  susdx: {
    coinmarketcapApiId: 34088,
    vaults: ["Stable+ Vault", "Index 500 Vault", "Index 500+ Vault"],
  },
  gho: {
    coinmarketcapApiId: 23508,
    vaults: ["Stable+ Vault", "Index 500 Vault", "Index 500+ Vault"],
  },
  gyd: {
    coinmarketcapApiId: 31996,
    vaults: ["Stable+ Vault", "Index 500 Vault", "Index 500+ Vault"],
  },
  wausdcn: {
    geckoterminal: {
      chain: "arbitrum",
      address: "0x11092be90af6553434e0962cddfd7d84a4444154",
    },
    vaults: ["Stable+ Vault", "Index 500 Vault", "Index 500+ Vault"],
  },
  wsteth: {
    coinmarketcapApiId: 12409,
    vaults: ["Index 500 Vault", "Index 500+ Vault", "ETH Vault"],
  },
  wrseth: {
    geckoterminal: {
      chain: "base",
      address: "0xedfa23602d0ec14714057867a78d01e94176bea0",
    },
    vaults: ["Index 500 Vault", "Index 500+ Vault", "ETH Vault"],
  },
  pendle: {
    coinmarketcapApiId: 9481,
    vaults: [
      "Index 500 Vault",
      "Index 500+ Vault",
      "ETH Vault",
      "Stable+ Vault",
      "Camelot Vault",
    ],
  },
  link: {
    coinmarketcapApiId: 1975,
    vaults: ["Index 500 Vault", "Index 500+ Vault"],
  },
  sol: {
    coinmarketcapApiId: 5426,
    vaults: ["Index 500 Vault", "Index 500+ Vault"],
  },
  gmx: {
    coinmarketcapApiId: 11857,
    vaults: ["Index 500 Vault", "Index 500+ Vault"],
  },
  magic: {
    coinmarketcapApiId: 14783,
    vaults: ["Index 500 Vault", "Index 500+ Vault"],
  },
  cbbtc: {
    coinmarketcapApiId: 32994,
    vaults: ["Index 500 Vault", "Index 500+ Vault"],
  },
  tbtc: {
    // coinmarketcapApiId: 32994,
    coinmarketcapApiId: 5776,
    vaults: ["Index 500 Vault", "Index 500+ Vault"],
  },
  bold: {
    geckoterminal: {
      chain: "base",
      address: "0x03569CC076654F82679C4BA2124D64774781B01D",
    },
    vaults: ["Stable+ Vault", "Index 500 Vault", "Index 500+ Vault"],
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
                    loading="lazy"
                    quality={50}
                    unoptimized={true}
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
                      loading="lazy"
                      quality={50}
                      unoptimized={true}
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
