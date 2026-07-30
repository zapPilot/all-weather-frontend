import { describe, it, expect, vi, afterEach } from "vitest";
import { optimism } from "thirdweb/chains";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";

const OWNER = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
const USDC_ON_OP = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
const noop = () => {};

const protocolsOn = (portfolioHelper, chain) =>
  Object.values(portfolioHelper.strategy).flatMap(
    (category) => category[chain] || [],
  );

// Each protocol sizes its own withdrawal, so a stand-in txn is enough to prove
// the surviving protocols still reach the batch
const stubZapOut = (protocol) =>
  vi
    .spyOn(protocol, "zapOut")
    .mockResolvedValue([{ zapOutOf: protocol.uniqueId() }]);

const zapOutParams = (overrides) => ({
  account: OWNER,
  chainMetadata: optimism,
  onlyThisChain: true,
  zapOutPercentage: 1,
  tokenOutSymbol: "usdc",
  tokenOutAddress: USDC_ON_OP,
  tokenOutDecimals: 6,
  slippage: 0.5,
  setTotalTradingLoss: noop,
  setTradingLoss: noop,
  setPlatformFee: noop,
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("zapOut with an unreachable protocol", () => {
  it("drops the failing protocol and names it instead of losing the batch", async () => {
    const portfolioHelper = getPortfolioHelper("Stable+ Vault");
    vi.spyOn(portfolioHelper, "getTokenPricesMappingTable").mockResolvedValue(
      {},
    );
    const [broken, ...healthy] = protocolsOn(portfolioHelper, "op").map(
      (p) => p.interface,
    );
    expect(healthy.length).toBeGreaterThan(0);

    vi.spyOn(broken, "usdBalanceOf").mockRejectedValue(
      new Error("price feed down"),
    );
    const brokenZapOut = stubZapOut(broken);
    healthy.forEach((protocol) => {
      vi.spyOn(protocol, "usdBalanceOf").mockResolvedValue(100);
      stubZapOut(protocol);
    });
    const onProtocolsSkipped = vi.fn();

    const txns = await portfolioHelper.portfolioAction(
      "zapOut",
      zapOutParams({ onProtocolsSkipped }),
    );

    expect(txns).toEqual(
      healthy.map((protocol) => ({ zapOutOf: protocol.uniqueId() })),
    );
    expect(brokenZapOut).not.toHaveBeenCalled();
    expect(onProtocolsSkipped).toHaveBeenCalledTimes(1);
    const skipped = onProtocolsSkipped.mock.calls[0][0];
    expect(skipped).toHaveLength(1);
    expect(skipped[0].uniqueId).toBe(broken.uniqueId());
    expect(skipped[0].error).toContain("price feed down");
  });

  it("reports nothing when every protocol produces txns", async () => {
    const portfolioHelper = getPortfolioHelper("Stable+ Vault");
    vi.spyOn(portfolioHelper, "getTokenPricesMappingTable").mockResolvedValue(
      {},
    );
    const protocols = protocolsOn(portfolioHelper, "op").map(
      (p) => p.interface,
    );
    protocols.forEach((protocol) => {
      vi.spyOn(protocol, "usdBalanceOf").mockResolvedValue(100);
      stubZapOut(protocol);
    });
    const onProtocolsSkipped = vi.fn();

    const txns = await portfolioHelper.portfolioAction(
      "zapOut",
      zapOutParams({ onProtocolsSkipped }),
    );

    expect(txns).toHaveLength(protocols.length);
    expect(onProtocolsSkipped).not.toHaveBeenCalled();
  });
});
