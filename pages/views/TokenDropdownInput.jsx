import React, { useState, useCallback, useEffect, memo } from "react";
import { Button, Space, Select } from "antd";
import { useReadContract } from "thirdweb/react";
import { balanceOf } from "thirdweb/extensions/erc20";
import { getContract } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { useActiveWalletChain } from "thirdweb/react";
import { arbitrum } from "thirdweb/chains";
import NumericInput from "./NumberInput";
import { selectBefore } from "../../utils/contractInteractions";

const TokenDropdownInput = memo(
  ({
    selectedToken,
    setSelectedToken,
    investmentAmount,
    setInvestmentAmount,
  }) => {
    const chainId = useActiveWalletChain();
    const contract = getContract({
      client: THIRDWEB_CLIENT,
      chain: arbitrum,
      address: selectedToken,
    });

    const { data: chosenTokenBalance } = useReadContract({
      contract: contract,
      method: balanceOf,
    });

    const handleInputChange = (eventValue) => {
      setInvestmentAmount(Number(eventValue));
    };

    const handleOnClickMax = () => {
      const balance = chosenTokenBalance ? chosenTokenBalance.displayValue : "";
      handleInputChange(balance);
    };

    useEffect(() => {
      if (selectedToken) {
        // Fetch balance or any other necessary data when selectedToken changes
      }
    }, [selectedToken]);

    return (
      <>
        <Space style={{ margin: "10px 0" }} role="crypto_input">
          {selectBefore(
            (value) => {
              console.log("value", value);
              setSelectedToken(value);
            },
            chainId?.id,
            selectedToken, // Pass the current selected token
          )}
          <NumericInput
            placeholder={`Balance: ${
              chosenTokenBalance ? chosenTokenBalance.displayValue : 0
            }`}
            value={investmentAmount}
            onChange={(value) => {
              handleInputChange(value);
            }}
          />
          <Button type="primary" onClick={handleOnClickMax}>
            Max
          </Button>
        </Space>
      </>
    );
  },
);
TokenDropdownInput.displayName = "TokenDropdownInput";

export default TokenDropdownInput;
