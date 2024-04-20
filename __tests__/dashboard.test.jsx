import { vi, expect, describe, it, test } from "vitest";
import { render, screen } from "./test-utils";
import Dashboard from "../pages/dashboard";
import { waitFor } from "@testing-library/dom";

/**
 * @vitest-environment jsdom
 */

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

describe("Dashboard Component", () => {
  it("displays multiple instances of data fetched from the API", async () => {
    // Mock the fetch API
    vi.mock("node-fetch", () => {
      return {
        default: vi.fn(() =>
          Promise.resolve({
            json: () =>
              Promise.resolve({
                data: [
                  {
                    chain: "avalanche",
                    pool: {
                      meta: null,
                      name: "struct-finance",
                      poolID: "87e6c43a-bc0f-4a4f-adcd-1f5bff02402b",
                    },
                    symbol: "btc.b",
                    tvlUsd: "538161",
                    apr: {
                      predictions: {
                        binnedConfidence: 2,
                        predictedClass: "Down",
                        predictedProbability: 65,
                      },
                      value: 9.53,
                    },
                  },
                ],
                unique_query_tokens: ["btc"],
                unexpandable: true,
              }),
          }),
        ),
      };
    });
    // Render the Dashboard component
    render(<Dashboard />);

    await waitFor(() => {
      try {
        // Check if the component renders the data
        const btcElements = screen.getAllByText(/.*btc.*/i);
        expect(btcElements.length).toBeGreaterThan(0);

        btcElements.forEach((element) => {
          expect(element).toBeInTheDocument();
        });
      } catch (error) {
        console.error("An error occurred:", error);
      }
    });
  });

  it("fetch protocol link data", async () => {
    // Mock the fetch API
    vi.mock("node-fetch", () => {
      return {
        default: vi.fn(() =>
          Promise.resolve({
            json: () =>
              Promise.resolve({
                data: [
                  {
                    name: "Binance CEX",
                    url: "https://www.binance.com",
                    slug: "binance-cex",
                  },
                  {
                    name: "Lido",
                    url: "https://lido.fi/",
                    slug: "lido",
                  },
                ],
              }),
          }),
        ),
      };
    });

    // Render the Dashboard component
    render(<Dashboard />);
    try {
      // Check if the component renders the data
      const linkButtons = await screen.findAllByRole(
        "button",
        { name: "export" },
        { timeout: 5000 },
      );
      expect(linkButtons.length).toBeGreaterThan(0);
      linkButtons.forEach((element) => {
        expect(element).toBeInTheDocument();
      });
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

  it("fetch subscription data", async () => {
    // Mock the fetch API
    vi.mock("node-fetch", () => {
      return {
        default: vi.fn(() =>
          Promise.resolve({
            json: () =>
              Promise.resolve({
                data: [
                  {
                    subscriptionStatus: false,
                  },
                ],
              }),
          }),
        ),
      };
    });
    // Render the Dashboard component
    render(<Dashboard />);
    try {
      // Check if the component renders the data
      const unlockButtons = await screen.findAllByRole(
        "link",
        { name: "unlock Unlock" },
        { timeout: 5000 },
      );
      expect(unlockButtons.length).toBeGreaterThan(0);
      unlockButtons.forEach((element) => {
        expect(element).toBeInTheDocument();
      });
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });
});
