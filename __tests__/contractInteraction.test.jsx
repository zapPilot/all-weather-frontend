// sum.test.js
import React, { useState } from "react";
import { render, screen, fireEvent, vi } from "@testing-library/react";
import { expect, test, describe } from "vitest";
import { chainIDToName } from "../utils/contractInteractions";
import { Modal } from "antd";

// mock tokens
const tokens = [
  {
    symbol: "USDC",
    address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    value: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    logoURI2:
      "https://tokens.1inch.io/0xaf88d065e77c8cc2239327c5edb3a432268e5831.png",
  },
  {
    symbol: "USDT",
    address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    value: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    logoURI2:
      "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
  },
];

const ModalComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div>
      <button onClick={showModal} role="select-token-button">
        USDC
      </button>
      <Modal
        title="Basic Modal"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        closable={false}
        role="modal"
        centered
      >
        {isModalOpen && (
          <div>
            {tokens.map((token) => (
              <button
                key={token.address}
                value={`${token.symbol}-${token.address}-6`}
                type="button"
              >
                <div>
                  <img alt={token.symbol} src={token.logoURI2} />
                  <span>{token.symbol}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

test("chainIDToName with valid chain ID", () => {
  expect(chainIDToName(56)).toBe("bsc");
});

test("chainIDToName with invalid chain ID", () => {
  expect(() => chainIDToName(5566)).toThrow(new Error("Unsupported Chain")); // Expect function to throw
});
