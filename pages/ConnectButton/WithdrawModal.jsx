import React, { useState, useEffect } from "react";
import { Modal, Button, Input, message, Alert } from "antd";
import {
  useActiveAccount,
  useSendTransaction,
  useActiveWalletChain,
} from "thirdweb/react";
import { getContract, prepareTransaction, toWei } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import { isAddress } from "ethers/lib/utils";
import TokenDropdownInput from "../views/TokenDropdownInput";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import tokens from "../views/components/slim_tokens.json";
import { tokensForDropDown } from "../../utils/contractInteractions";

const WithdrawModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [amount, setAmount] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const { mutate: sendTransaction } = useSendTransaction();

  // Set default token when modal opens and chain is available
  useEffect(() => {
    if (isModalOpen && chain && !selectedToken) {
      const chainId = chain.id;
      const availableTokens = tokens.props.pageProps.tokenList[
        String(chainId)
      ]?.filter((option) =>
        tokensForDropDown.some(
          (symbol) => option.symbol.toLowerCase() === symbol && option.logoURI2,
        ),
      );

      if (availableTokens && availableTokens.length > 0) {
        const firstToken = availableTokens[0];
        const tokenKey = `${firstToken.symbol}-${firstToken.address}-${firstToken.decimals}`;
        setSelectedToken(tokenKey);
      }
    }
  }, [isModalOpen, chain, selectedToken]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    // Reset state
    setSelectedToken(null);
    setAmount(0);
    setRecipient("");
  };

  const handleWithdraw = async () => {
    if (!account || !chain) {
      message.error("Wallet not connected");
      return;
    }

    if (!selectedToken) {
      message.error("Please select a token");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      message.error("Please enter a valid amount");
      return;
    }

    if (!recipient || !isAddress(recipient)) {
      message.error("Please enter a valid recipient address");
      return;
    }

    setIsLoading(true);

    try {
      const [tokenSymbol, tokenAddress, tokenDecimals] =
        selectedToken.split("-");
      const amountInWei = toWei(amount.toString());

      let transaction;

      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        // Native token transfer
        transaction = prepareTransaction({
          to: recipient,
          chain,
          client: THIRDWEB_CLIENT,
          value: toWei(amount.toString()),
        });
      } else {
        // ERC20 token transfer
        const contract = getContract({
          client: THIRDWEB_CLIENT,
          chain,
          address: tokenAddress,
        });

        transaction = transfer({
          contract,
          to: recipient,
          amount: amount,
        });
      }

      await new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (txResult) => {
            message.success("Withdrawal successful!");
            handleCancel();
            resolve(txResult);
          },
          onError: (error) => {
            console.error("Transaction error:", error);
            message.error(`Withdrawal failed: ${error.message}`);
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error("Withdrawal error:", error);
      message.error("An error occurred during withdrawal");
    } finally {
      setIsLoading(false);
    }
  };

  const getChainName = () => {
    return chain?.name || "Unknown";
  };

  return (
    <>
      <Button onClick={showModal} type="primary" className="ml-2">
        Withdraw
      </Button>
      <Modal
        title="Withdraw from AA Wallet"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isLoading}
            onClick={handleWithdraw}
          >
            Withdraw
          </Button>,
        ]}
      >
        <div className="flex flex-col gap-4 py-4">
          {/* Chain Warning */}
          <Alert
            message={`You are on ${getChainName()} network`}
            description="Make sure the recipient address supports this network"
            type="info"
            showIcon
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Token & Amount
            </label>
            <TokenDropdownInput
              selectedToken={selectedToken}
              setSelectedToken={setSelectedToken}
              setInvestmentAmount={setAmount}
              tokenPricesMappingTable={{}}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Address
            </label>
            <Input
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          {/* Safety Warning */}
          <Alert
            message="⚠️ Important Safety Notice"
            description={
              <div>
                <p className="mb-1">
                  • Double-check the recipient address is correct
                </p>
                <p className="mb-1">
                  • Do NOT send to centralized exchange (CEX) deposit addresses
                  unless they explicitly support {getChainName()}
                </p>
                <p>
                  • Sending to wrong address or unsupported network may result
                  in permanent loss of funds
                </p>
              </div>
            }
            type="warning"
            showIcon
          />
        </div>
      </Modal>
    </>
  );
};

export default WithdrawModal;
