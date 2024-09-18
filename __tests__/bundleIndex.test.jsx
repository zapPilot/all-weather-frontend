import React, { useEffect, useState } from "react";
import { vi, expect, describe, it } from "vitest";
import { render, screen, fireEvent } from "./test-utils.tsx";
import BundleIndex from "../pages/bundle/index.jsx";

const { useRouter } = vi.hoisted(() => {
  const mockedRouterPush = vi.fn();
  return {
    useRouter: () => ({ push: mockedRouterPush }),
    mockedRouterPush,
  };
});

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    useRouter,
  };
});

// mock the thirdweb react module
vi.mock("thirdweb/react", async () => {
  const actual = await vi.importActual("thirdweb/react");
  let currentAddress = null; // mock current address
  const mockUseActiveAccount = vi.fn(() => ({ address: currentAddress }));

  return {
    ...actual,
    useActiveAccount: mockUseActiveAccount,
  };
});

// mock the fetch function
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([{ address: "0x123" }, { address: "0x456" }]),
  }),
);

// mock the address bundle component
function AddressBundle() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const response = await fetch();
      const data = await response.json();
      setAddresses(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  return loading ? (
    <p>Loading...</p>
  ) : (
    addresses.map((address, index) => (
      <p key={index} role="address">
        {address.address}
      </p>
    ))
  );
}

describe("Bundle Component", () => {
  it("fetch bundle data", async () => {
    render(<AddressBundle />);
    const addressElements = await screen.findAllByRole(
      "address",
      {},
      { timeout: 10000 },
    );
    addressElements.forEach((element) => {
      expect(element).toBeInTheDocument();
      expect(["0x123", "0x456"]).toContain(element.textContent.trim());
    });
  });
});
