import { Button, Space } from "antd";
import { useState } from "react";
import { selectBefore } from "../../utils/contractInteractions";
import NumericInput from "./NumberInput";
import { DollarOutlined } from "@ant-design/icons";
import { useReadContract } from "thirdweb/react";
import { balanceOf } from "thirdweb/extensions/erc20";
import { getContract } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { useActiveWalletChain } from "thirdweb/react";
import { arbitrum, optimism } from "thirdweb/chains";

const TokenDropdownInput = ({
  onClickCallback,
  normalWording,
  loadingWording,
  account,
}) => {
  // default value 0x55d398326f99059ff775485246999027b3197955 stands for USDT on BSC
  const [chosenToken, setChosenToken] = useState(
    "0x55d398326f99059ff775485246999027b3197955",
  );
  const chainId = useActiveWalletChain();
  const contract = getContract({
    clien: THIRDWEB_CLIENT,
    chain: arbitrum,
    address: chosenToken,
    // chosenToken === "0x0000000000000000000000000000000000000000" ||
    // chosenToken === ""
    // ? undefined
    // : chosenToken
    // optional ABI
  });
  const { data: chosenTokenBalance } = useReadContract({
    contract: contract,
    method: balanceOf,
  });

  const [amount, setAmount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const handleInputChange = async (eventValue) => {
    if (eventValue === "") {
      return;
    }
    setInputValue(eventValue);
    setAmount(eventValue);
  };

  const handleOnClickMax = async () => {
    setAmount(chosenTokenBalance.displayValue);
    setInputValue(chosenTokenBalance.displayValue);
    handleInputChange(chosenTokenBalance.displayValue);

    // TODO(david): find a better way to implement.
    // Since `setAmount` need some time to propagate, the `amount` would be 0 at the first click.
    // then be updated to the correct value at the second click.
    if (approveAmount < amount || amount === 0) {
      setApproveReady(false);
    }
  };
  const [apiDataReady, setApiDataReady] = useState(true);
  return (
    <>
      <Space.Compact
        style={{
          margin: "10px 0",
        }}
      >
        {selectBefore(
          (value) => {
            setChosenToken(value);
            console.log("value", value);
          },
          "address",
          chainId?.id,
        )}
        <NumericInput
          placeholder={`Balance: ${
            chosenTokenBalance ? chosenTokenBalance.displayValue : 0
          }`}
          value={inputValue}
          onChange={(value) => {
            handleInputChange(value);
          }}
        />
        <Button type="primary" onClick={handleOnClickMax}>
          Max
        </Button>
      </Space.Compact>
      <Button
        loading={!apiDataReady}
        onClick={() => onClickCallback(amount, chosenToken, account)}
        type="primary"
        icon={<DollarOutlined />}
        style={{
          margin: "10px 0",
        }}
      >
        {apiDataReady ? normalWording : loadingWording}
      </Button>
    </>
  );
};
export default TokenDropdownInput;
