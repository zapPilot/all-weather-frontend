import { Button, Space } from "antd";
import { useState } from "react";
import { selectBefore } from "../../utils/contractInteractions";
import NumericInput from "./NumberInput";
import { DollarOutlined } from "@ant-design/icons";
import { useBalance } from "@thirdweb-dev/react";
import { useChainId } from "@thirdweb-dev/react";

const TokenDropdownInput = ({
  address,
  onClickCallback,
  normalWording,
  loadingWording,
}) => {
  const [chosenToken, setChosenToken] = useState("");
  const { data: chosenTokenBalance } = useBalance(
    chosenToken === "0x0000000000000000000000000000000000000000" ||
      chosenToken === ""
      ? undefined
      : chosenToken,
  );
  const [amount, setAmount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const chainId = useChainId();
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
          chainId,
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
        onClick={() => onClickCallback(amount, chosenToken)}
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
