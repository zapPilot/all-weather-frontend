import { Button, Space } from "antd";
import { useState } from "react";
import { selectBefore } from "../../utils/contractInteractions";
import NumericInput from "./NumberInput";
import { DollarOutlined } from "@ant-design/icons";
import { useContract, useContractRead } from "@thirdweb-dev/react";

const TokenDropdownInput = ({
  address,
  onClickCallback,
  normalWording,
  loadingWording,
}) => {
  const [chosenToken, setChosenToken] = useState(
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  );
  const { contract } = useContract(chosenToken);
  const { data: chosenTokenBalance } = useContractRead(
    contract,
    "balanceOf",
    address,
  );
  // const { data: chosenTokenBalance } = useBalance({
  //   address,
  //   ...(chosenToken === "0x0000000000000000000000000000000000000000"
  //     ? {}
  //     : { token: chosenToken }), // Include token only if chosenToken is truthy
  //   // token: chosenToken,
  //   onError(error) {
  //     console.log(`cannot read ${chosenToken} Balance:`, error);
  //     throw error;
  //   },
  // });
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
    setAmount(chosenTokenBalance.formatted);
    setInputValue(chosenTokenBalance.formatted);
    handleInputChange(chosenTokenBalance.formatted);

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
          },
          "address",
          42161,
        )}
        <NumericInput
          placeholder={`Balance: ${
            chosenTokenBalance ? chosenTokenBalance.formatted : 0
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
