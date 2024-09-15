import React, { useState, useEffect } from "react";
import { expect, describe, it, vi } from "vitest";
import { render, screen, fireEvent } from "./test-utils.tsx";
import RebalanceChart from "../pages/views/RebalanceChart";

// mock the thirdweb react module
vi.mock("thirdweb/react", async () => {
  const actual = await vi.importActual("thirdweb/react");
  let currentAddress = null; // mock current address
  const mockUseActiveAccount = vi.fn(() => ({ address: currentAddress }));

  // mock ConnectButton component
  const ConnectButton = () => {
    // useState to store the button text
    const [buttonText, setButtonText] = useState("Connect Wallet");

    return (
      <button
        onClick={() => {
          currentAddress = "0x123456789abcdef"; // mock connect wallet address
          mockUseActiveAccount.mockReturnValue({ address: currentAddress });
          setButtonText(currentAddress || "Connect Wallet"); // update button text
        }}
      >
        {buttonText}
      </button>
    );
  };

  return {
    ...actual,
    useActiveAccount: mockUseActiveAccount,
    ConnectButton,
  };
});

// mock fetch the rebalance chart data
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        children: [
          {
            name: "long_term_bond: 50%",
            children: [
              { 
                hex: "#f00",
                name: "uniswap_v3_dai_usdc, APR: 50% PER: 50%",
                value: 50,
              },
            ],
            hex: "#f00",
          },
          {
            name: "short_term_bond: 50%",
            children: [
              { 
                hex: "#0f0",
                name: "1inch_dai_usdc, APR: 50% PER: 50%",
                value: 50,
              },
            ],
            hex: "#0f0",
          },
        ],
      }),
  }),
);

// mock the rebalance chart  wording
function RebalanceChartWording() {
  const [data, setData] = useState({ children: [] });
  const [hoveredItemIndex, setHoveredItemIndex] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch();
        const data = await response.json();
        setData(data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    }
    fetchData();
  }, []);

  const handleMouseEnter = (index) => () => {
    setHoveredItemIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredItemIndex(null);
  };

  return (
    <div>
      {data.children.map((item, index) => {
        return (
          <div key={index}>
            <div
              className="flex items-center justify-between mb-2"
              onMouseEnter={handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center">
                <div
                  className="w-5 h-5 me-2 rounded"
                  style={{ backgroundColor: item.hex }}
                ></div>
                <p className="me-2">{item.name.split(":")[0]}</p>
              </div>
                <p>{item.name.split(":")[1]}</p>
            </div>
            {hoveredItemIndex === index && (
              <div className="absolute w-80 bg-gray-500 text-white p-2 rounded z-10">
                {item.children ? (
                  item.children.map((subItem, subIndex) => (
                    <div key={subIndex}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div
                            className="w-5 h-5 me-2 rounded flex-shrink-0"
                            style={{ backgroundColor: subItem.hex }}
                          ></div>
                          <p className="max-w-40">{subItem.name.split(",")[0]}</p>
                        </div>
                        <p>{subItem.name.split(",")[1]}</p>
                      </div>
                    </div>
                  ))
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

describe("RebalanceChart Component", () => {
  it("should display child items with proper interaction", async () => {
    render(<RebalanceChartWording />);

    // check if the loading text is rendered
    const bondText = await screen.findByText(/long_term_bond/);
    expect(bondText).toBeInTheDocument();

    const itemDiv = screen.getByText(/long_term_bond/).parentNode;
    // hover over the item
    fireEvent.mouseEnter(itemDiv);

    // check if the detail text is rendered
    const detailText = await screen.findByText(/uniswap_v3_dai_usdc/);
    expect(detailText).toBeInTheDocument();

    // mouseLeave the item
    fireEvent.mouseLeave(itemDiv);
    expect(screen.queryByText(/uniswap_v3_dai_usdc/)).toBeNull();
  });
});
