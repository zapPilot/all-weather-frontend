import { Select } from "antd";
import tokens from "../pages/views/components/tokens.json";
import { fetch1InchSwapData } from "./oneInch";
import { portfolioVaults } from "./oneInch";

const { Option } = Select;
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const selectBefore = (handleChange) => (
  <Select
    onChange={handleChange}
    defaultValue={
      <Option key="USDT" value="0x55d398326f99059ff775485246999027b3197955">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img
            src="https://icons.llamao.fi/icons/agg_icons/binance?w=24&h=24"
            width="20"
            height="20"
            alt="usdt"
          />
          <span
            style={{
              marginLeft: 6
            }}
          >
            USDT
          </span>
        </div>
      </Option>
    }
    theme="light"
    style={{
      width: 100,
    }}
  >
    {tokens.props.pageProps.tokenList["56"].slice(0, 20).map((option) => (
      <Option key={option.address} value={option.address}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
        }}>
          <img src={option.logoURI2} width="20" height="20" alt={option.symbol} />
          <span
            style={{
              marginLeft: 6
            }}
          >
            {option.symbol}
          </span>
          
        </div>
      </Option>
    ))}
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
  if (chosenTokenFor1Inch === toToken) {
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
      )}&refresh=True`,
    )
    .catch((error) =>
      messageApi.error({
        content: `${error.shortMessage}. Please report this issue to our Discord.`,
        duration: 5,
      }),
    );
}
