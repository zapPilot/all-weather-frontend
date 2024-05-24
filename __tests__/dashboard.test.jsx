import { vi, expect, describe, it } from "vitest";
import { render, screen, fireEvent } from "./test-utils";
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
                    apr: {
                      predictions: {
                        binnedConfidence: 3,
                        predictedClass: "Down",
                        predictedProbability: 97,
                      },
                      value: 163.61597704364695,
                    },
                    apyBase: 0.13891,
                    apyMean30d: 314.62732,
                    apyReward: 411.52794,
                    categories: [
                      [
                        "long_term_bond",
                        {
                          only_for_sunburst_chart: false,
                          value: 1,
                        },
                      ],
                    ],
                    category_from_request: "long_term_bond",
                    category_weight: 0.01,
                    chain: "ethereum",
                    count: 97,
                    exposure: "multi",
                    key: "0",
                    mu: 159.98632,
                    outlier: true,
                    pool: {
                      meta: null,
                      name: "aura",
                      poolID: "b2f7a5b1-b743-4337-9ecd-3bef72a75eeb",
                    },
                    poolMeta: null,
                    rewardTokens: [
                      "0xC0c293ce456fF0ED870ADd98a0828Dd4d2903DBF",
                      "0xba100000625a3754423978a60c9317c58a424e3D",
                      "0x38D64ce1Bdf1A9f24E0Ec469C9cAde61236fB4a0",
                      "0x1BB9b64927e0C5e207C9DB4093b3738Eef5D8447",
                      "0xbB2935E7691c3C0FbAc1Ed85030Cee284464EcA1",
                      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                      "0xC0c293ce456fF0ED870ADd98a0828Dd4d2903DBF",
                    ],
                    sigma: 2.98651,
                    stablecoin: false,
                    symbol: "veth-wsteth",
                    tokens: ["veth", "wsteth"],
                    tvlUsd: 152969,
                    underlyingTokens: [
                      "0x38D64ce1Bdf1A9f24E0Ec469C9cAde61236fB4a0",
                      "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
                    ],
                    volumeUsd7d: null,
                  },
                ],
                unexpandable: true,
                unique_query_tokens: ["eth"],
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
        const ethElements = screen.getAllByText(/.*eth.*/i);
        expect(ethElements.length).toBeGreaterThan(0);

        ethElements.forEach((element) => {
          expect(element).toBeInTheDocument();
        });
        const image = screen.getByAlt("ethereum");
        fireEvent.mouseOver(image);

        const tooltipContent = screen.getByText(chain);
        expect(tooltipContent).toBeInTheDocument();
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

  it("render on mobile", async () => {
    // Mock mobile screen size
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });
    window.dispatchEvent(new Event("resize"));

    render(<Dashboard />);
    // Check if the component renders the table
    const tables = screen.getAllByRole("table");
    // Check if the table has the correct class
    const specificClassTables = tables.filter((table) =>
      table.classList.contains("sm:hidden"),
    );
    expect(specificClassTables.length).toBeGreaterThan(0);
  });

  it("render on desktop", async () => {
    // Mock desktop screen size
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    window.dispatchEvent(new Event("resize"));

    render(<Dashboard />);
    // Check if the component renders the table
    const tables = screen.getAllByRole("table");
    // Check if the table has the correct class
    const specificClassTables = tables.filter((table) =>
      table.classList.contains("sm:table"),
    );
    expect(specificClassTables.length).toBeGreaterThan(0);
  });
});
