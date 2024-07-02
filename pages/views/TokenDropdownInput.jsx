import { Button, Space } from "antd";
import { useState } from "react";
import { selectBefore } from "../../utils/contractInteractions";
import NumericInput from "./NumberInput";
import { useReadContract } from "thirdweb/react";
import { balanceOf } from "thirdweb/extensions/erc20";
import { getContract } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { useActiveWalletChain } from "thirdweb/react";
import { arbitrum } from "thirdweb/chains";

const TokenDropdownInput = () => {
  const [chosenToken, setChosenToken] = useState("");
  const chainId = useActiveWalletChain();
  const contract = getContract({
    client: THIRDWEB_CLIENT,
    chain: arbitrum,
    address: chosenToken,
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
  return (
    <>
      <Space.Compact
        style={{
          margin: "10px 0",
        }}
        role="crypto_input"
      >
        {selectBefore(
          (value) => {
            setChosenToken(value);
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
    </>
  );
};
export default TokenDropdownInput;
