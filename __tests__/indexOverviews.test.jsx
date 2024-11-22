import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "./test-utils.tsx";
import IndexOverviews from "../pages/indexes/indexOverviews.jsx";

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
      loading: false,
      error: null,
    })),
  };
});

// 1. Mock useActiveAccount
vi.mock("thirdweb/react", async () => {
  const actual = await vi.importActual("thirdweb/react");
  const mockUseActiveAccount = vi.fn(() => ({ address: "0x123456789abcdef" }));

  return {
    ...actual,
    useActiveAccount: mockUseActiveAccount,
  };
});

// mock portfolioHelper
const mockPortfolioHelper = {
  lockUpPeriod: vi.fn().mockResolvedValue(0),
  description: vi.fn().mockReturnValue("description"),
  sumUsdDenominatedValues: vi.fn().mockReturnValue("$"),
  rebalanceThreshold: vi.fn().mockReturnValue(0.05),
  swapFeeRate: vi.fn().mockReturnValue(0.00299),
  denomination: vi.fn().mockReturnValue("$"),
  getTokenPricesMappingTable: vi.fn().mockResolvedValue({}),
  usdBalanceOf: vi.fn().mockResolvedValue(
    Object.assign([0, { pendingRewards: { pendingRewardsDict: {} } }], {
      0: 0,
      1: { pendingRewards: { pendingRewardsDict: {} } },
    }),
  ),
  calProtocolAssetDustInWalletDictionary: vi.fn().mockResolvedValue({}),
  strategy: {
    Lending: {
      Ethereum: [
        {
          weight: 0.5,
          interface: {
            protocolName: "Aave",
            symbolList: ["USDC", "USDT"],
            uniqueId: () => "aave-eth",
          },
        },
        {
          weight: 0.5,
          interface: {
            protocolName: "Compound",
            symbolList: ["USDC"],
            uniqueId: () => "compound-eth",
          },
        },
      ],
    },
  },
};

// mock getPortfolioHelper
vi.mock("../utils/thirdwebSmartWallet.ts", () => ({
  getPortfolioHelper: () => mockPortfolioHelper,
}));

describe("IndexOverviews Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioHelper.lockUpPeriod.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockPortfolioHelper.lockUpPeriod.mockReset();
    // Clear any timeouts or intervals if set
    clearTimeout();
    clearInterval();
  });

  it("fetch indexes data and apr", async () => {
    render(<IndexOverviews />);
    const vault = await screen.findByRole("vault");
    // Check if the vault name is correct
    expect(vault.textContent).toBe("Stablecoin Vault");
    const indexesAprElements = await screen.findAllByRole("apr");
    indexesAprElements.forEach((element) => {
      // Check if the APR is correct
      expect(element.textContent.includes("5.00%")).toBe(true);
    });
  });

  it('should show "Unlocked" when lockUpPeriod is 0', async () => {
    // mock lockUpPeriod
    mockPortfolioHelper.lockUpPeriod.mockResolvedValue(0);

    const { container } = render(<IndexOverviews />, {
      preloadedState: {
        account: {
          address: "0x123456789abcdef",
        },
        strategyMetadata: {
          loading: false,
          error: null,
          strategyMetadata: {
            "Stablecoin Vault": {
              portfolioAPR: 0.05,
            },
          },
        },
      },
    });

    await waitFor(
      async () => {
        const lockUpPeriods = screen.getAllByRole("lockUpPeriod");
        lockUpPeriods.forEach((element) => {
          expect(element.textContent).toBe("Unlocked");
        });
      },
      {
        timeout: 5000,
        interval: 100,
      },
    );
  });

  it("should show remaining time when lockUpPeriod is greater than 0", async () => {
    // mock lockUpPeriod
    mockPortfolioHelper.lockUpPeriod.mockReset();
    mockPortfolioHelper.lockUpPeriod.mockResolvedValue(172800);

    render(<IndexOverviews />);

    await waitFor(
      async () => {
        // find the locked period
        const lockUpPeriods = screen.getAllByRole("lockUpPeriod");
        const lockedPeriod = lockUpPeriods.find((element) =>
          element.className.includes("text-red-500"),
        );

        // ensure the locked period is found and the content is correct
        expect(lockedPeriod).toBeInTheDocument();
        expect(lockedPeriod.textContent.trim()).toBe("2 d");
      },
      {
        timeout: 5000,
        interval: 100,
      },
    );
  });
});
