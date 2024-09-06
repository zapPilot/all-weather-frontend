import { vi, describe, expect, it } from "vitest";
import { render, screen } from "./test-utils.tsx";
import IndexOverviews from "../pages/indexes/indexOverviews.jsx";

const { useRouter, mockedRouterPush } = vi.hoisted(() => {
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

// mock fetch portfolioName
vi.mock("next/router", async () => {
  const actual = await vi.importActual("next/router");
  return {
    ...actual,
    useRouter: () => ({
      query: { portfolioName: "Stablecoin Vault" },
    }),
  };
});

// mock fetch portfolioApr
vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useSelector: vi.fn(() => ({
      strategyMetadata: {
        "Stablecoin Vault": {
          portfolioAPR: 0.05,
        },
      },
    })),
  };
});

describe("IndexOverviews Component", () => {
  it("fetch indexes data and apr", async () => {
    render(<IndexOverviews />);
    const vault = await screen.findByRole("vault");
    // Check if the vault name is correct
    expect(vault.textContent).toBe("Stablecoin Vault");
    const indexesAprElements = await screen.findAllByRole("apr");
    indexesAprElements.forEach((element) => {
      // Check if the APR is correct
      expect(element.textContent).toBe("5.00%");
    });
  });
});
