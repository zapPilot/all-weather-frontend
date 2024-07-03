import { Select } from "antd";
import { fetch1InchSwapData } from "./oneInch";
import tokens from "../pages/views/components/tokens.json";
import { portfolioVaults } from "./oneInch";
import axios from "axios";

const { Option } = Select;
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const relevantSymbols = [
  "eth",
  "usdc.e",
  "usdc",
  "usdt",
  "wbtc",
  "weth",
  "frax",
  "wsteth",
  "usds",
  "eura",
  "usd+",
  "reth",
  "pendle",
  "ezeth",
  "cbeth",
  "lusd",
  "susd",
  "euroe",
  "axlusdc",
];
export const selectBefore = (
  handleChange,
  addressOrSymbol,
  chainID,
  selectedToken,
) => (
  <Select
    onChange={handleChange}
    value={selectedToken || "Please select a token"}
    theme="light"
    style={{ width: 100 }}
  >
    {tokens.props.pageProps.tokenList[String(chainID)]
      ?.filter((option) =>
        relevantSymbols.some(
          (symbol) => option.symbol.toLowerCase() === symbol && option.logoURI2,
        ),
      )
      ?.map((option) => {
        const keyAndValue =
          addressOrSymbol === "address" ? option.address : option.symbol;
        return (
          <Option key={keyAndValue} value={keyAndValue}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <img
                src={option.logoURI2}
                width="20"
                height="20"
                alt={option.symbol}
              />
              <span style={{ marginLeft: 6 }}>{option.symbol}</span>
            </div>
          </Option>
        );
      })}
  </Select>
);

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
