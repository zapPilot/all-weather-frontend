import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import { encode } from "thirdweb";
import { arbitrum, optimism } from "thirdweb/chains";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { fetchWalletTokens } from "../../utils/dustConversion";
import {
  buildProtocolGroups,
  clearAaExitWalletTokenCache,
  clearAaExitWalletTokenMemoryCache,
  scanAaExit,
} from "../../utils/aaExit";

vi.mock("../../utils/dustConversion", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchWalletTokens: vi.fn(),
}));

const OWNER = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
const RECIPIENT = "0x1234567890123456789012345678901234567890";
const ALT_RECIPIENT = "0x9876543210987654321098765432109876543210";
const USDC_OP = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
// transfer(address,uint256)
const TRANSFER_SELECTOR = "a9059cbb";
const noop = () => {};

const protocolsOn = (portfolioName, chain) =>
  Object.values(getPortfolioHelper(portfolioName).strategy)
    .flatMap((category) => category[chain] || [])
    .map((protocol) => ({
      uniqueId: protocol.interface.uniqueId(),
      label: protocol.interface.toString(),
      interface: protocol.interface,
    }));

const token = ({ id, price, decimals = 6, amount, symbol = "TKN" }) => ({
  id,
  price,
  decimals,
  optimized_symbol: symbol,
  protocol_id: "",
  amount: Number(ethers.utils.formatUnits(amount, decimals)),
  raw_amount_hex_str: ethers.BigNumber.from(amount).toHexString(),
});

const amountIn = async (txn) =>
  ethers.BigNumber.from(`0x${(await encode(txn)).slice(-64)}`);

const mockUsdcOnChainBalance = (amount) => {
  ethers.providers.BaseProvider.prototype.call.mockImplementation(
    async (request) => {
      const to = ((await request?.to) || "").toLowerCase();
      if (to !== USDC_OP.toLowerCase()) return ethers.constants.HashZero;
      const data = (await request?.data) || "0x";
      // balanceOf(address)
      if (data.slice(0, 10) === "0x70a08231") {
        return ethers.utils.hexZeroPad(
          ethers.BigNumber.from(amount).toHexString(),
          32,
        );
      }
      // transfer(address,uint256) simulated successfully
      if (data.slice(0, 10) === "0xa9059cbb") {
        return ethers.utils.hexZeroPad("0x01", 32);
      }
      return ethers.constants.HashZero;
    },
  );
};

const stub = (protocol, { staked, wallet }) => {
  vi.spyOn(protocol, "stakeBalanceOf").mockResolvedValue(
    ethers.BigNumber.from(staked),
  );
  vi.spyOn(protocol, "assetBalanceOf").mockResolvedValue(
    ethers.BigNumber.from(wallet),
  );
  vi.spyOn(protocol, "customClaim").mockResolvedValue([[], {}]);
};

beforeEach(() => {
  clearAaExitWalletTokenCache();
  fetchWalletTokens.mockResolvedValue([]);
  vi.spyOn(
    ethers.providers.BaseProvider.prototype,
    "getBalance",
  ).mockResolvedValue(ethers.constants.Zero);
  // scanAaExit builds its own protocol instances, so they cannot be stubbed from
  // out here — every on-chain read is answered instead. Zero everywhere means
  // "no positions"; the fee token reports plenty so the fee clamp is a no-op.
  vi.spyOn(ethers.providers.BaseProvider.prototype, "call").mockImplementation(
    async (request) => {
      const to = ((await request?.to) || "").toLowerCase();
      return ethers.utils.hexZeroPad(
        to === USDC_OP.toLowerCase()
          ? ethers.BigNumber.from("1000000000000000000000").toHexString()
          : "0x00",
        32,
      );
    },
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildProtocolGroups", () => {
  it("skips a protocol the user holds nothing in", async () => {
    const protocols = protocolsOn("Velodrome Vault", "op");
    protocols.forEach((protocol) =>
      stub(protocol.interface, { staked: "0", wallet: "0" }),
    );

    expect(
      await buildProtocolGroups({
        protocols,
        owner: OWNER,
        recipient: RECIPIENT,
      }),
    ).toEqual([]);
  });

  it("unstakes and transfers what the user does hold", async () => {
    const protocols = protocolsOn("Velodrome Vault", "op");
    stub(protocols[0].interface, { staked: "1000", wallet: "0" });

    const [group] = await buildProtocolGroups({
      protocols,
      owner: OWNER,
      recipient: RECIPIENT,
    });

    expect(group.kind).toBe("protocol");
    expect(group.level).toBe(0);
    expect(group.dependent).toBe(true);
    expect(group.txns).toHaveLength(2);
    expect(group.sweptAssetAddress).toBe(
      protocols[0].interface.assetContract.address,
    );
  });

  it("reports a position as soon as its protocol scan finishes", async () => {
    const [protocol] = protocolsOn("Velodrome Vault", "op");
    stub(protocol.interface, { staked: "1000", wallet: "0" });
    const onProtocolScanned = vi.fn();

    await buildProtocolGroups({
      protocols: [protocol],
      owner: OWNER,
      recipient: RECIPIENT,
      onProtocolScanned,
    });

    expect(onProtocolScanned).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol,
        completed: 1,
        total: 1,
        found: true,
        failed: false,
      }),
    );
  });

  // level 1 is the retry that sheds the claim leg — the one part that reaches
  // into third-party APIs
  it("drops the claim at level 1", async () => {
    const protocols = protocolsOn("Velodrome Vault", "op");
    const protocol = protocols[0].interface;
    vi.spyOn(protocol, "stakeBalanceOf").mockResolvedValue(
      ethers.BigNumber.from("1000"),
    );
    vi.spyOn(protocol, "assetBalanceOf").mockResolvedValue(
      ethers.constants.Zero,
    );
    const customClaim = vi.spyOn(protocol, "customClaim");

    const [group] = await buildProtocolGroups({
      protocols,
      owner: OWNER,
      recipient: RECIPIENT,
      level: 1,
    });

    expect(customClaim).not.toHaveBeenCalled();
    expect(group.rewardBalances).toEqual([]);
    expect(group.txns).toHaveLength(2);
  });

  it("keeps a protocol that failed to build as a failed row", async () => {
    const protocols = protocolsOn("Velodrome Vault", "op");
    vi.spyOn(protocols[0].interface, "stakeBalanceOf").mockRejectedValue(
      new Error("rpc down"),
    );

    const [group] = await buildProtocolGroups({
      protocols,
      owner: OWNER,
      recipient: RECIPIENT,
    });

    expect(group.buildError).includes("rpc down");
    expect(group.txns).toEqual([]);
  });
});

describe("Venus emergencyTransfer", () => {
  const venusProtocol = () =>
    protocolsOn("Stable+ Vault", "arbitrum").find((protocol) =>
      protocol.uniqueId.includes("/venus/"),
    ).interface;

  // ethers defines contract methods as non-configurable, so the whole read-only
  // instance is swapped out. getPortfolioHelper builds fresh instances per call,
  // so this cannot leak into another test.
  const withVTokenBalance = (protocol, balance) => {
    protocol.stakeFarmContractInstance = {
      balanceOf: vi.fn().mockResolvedValue(ethers.BigNumber.from(balance)),
    };
    return protocol;
  };

  // The base implementation would transfer the underlying USDC using the vToken
  // share amount — wrong token and wrong amount
  it("hands over the vToken itself", async () => {
    const protocol = withVTokenBalance(venusProtocol(), "123456");

    const { txns, rewardBalances } = await protocol.emergencyTransfer(
      OWNER,
      RECIPIENT,
      noop,
    );

    expect(txns).toHaveLength(1);
    expect(await encode(txns[0])).includes(TRANSFER_SELECTOR);
    expect((await amountIn(txns[0])).toString()).toBe("123456");
    expect(rewardBalances).toEqual([]);
    // the vToken, which is emphatically not the underlying this protocol names
    // as its assetContract
    expect(txns[0].to).toBe(protocol.protocolContract.address);
    expect(txns[0].to).not.toBe(protocol.assetContract.address);
  });

  it("produces nothing when the vToken balance is zero", async () => {
    const protocol = withVTokenBalance(venusProtocol(), "0");

    expect(await protocol.emergencyTransfer(OWNER, RECIPIENT, noop)).toEqual({
      txns: [],
      rewardBalances: [],
    });
  });

  // The sweep must exclude the vToken it hands over, not the underlying, or the
  // user's loose USDC would be left behind
  it("reports the vToken as the address it sweeps", () => {
    expect(venusProtocol().sweptAssetAddress()).toBe(
      venusProtocol().protocolContract.address,
    );
  });
});

describe("scanAaExit", () => {
  const scanOnOptimism = () =>
    scanAaExit({
      owner: OWNER,
      recipient: RECIPIENT,
      chainName: "op",
      chainMetadata: optimism,
    });

  // Positions come out empty here — protocol group building has its own tests
  // above, and faking a funded gauge through raw eth_call responses would test
  // the mock rather than the code.
  it("puts the fee before the sweeps and native last", async () => {
    fetchWalletTokens.mockResolvedValue([
      token({ id: USDC_OP, price: 1, amount: "5000000", symbol: "USDC" }),
    ]);
    ethers.providers.BaseProvider.prototype.getBalance.mockResolvedValue(
      ethers.BigNumber.from("1000"),
    );

    const { groups, feePlan } = await scanOnOptimism();
    const kinds = groups.map((group) => group.kind);

    expect(kinds.indexOf("fee")).toBeLessThan(kinds.indexOf("sweep"));
    expect(kinds[kinds.length - 1]).toBe("native");
    expect(feePlan.symbol).toBe("USDC");
  });

  // fee + a full-balance sweep of the same token asks for more than the wallet
  // holds and reverts the whole atomic batch
  it("sweeps the fee token short by the fee", async () => {
    mockUsdcOnChainBalance("5000000");
    fetchWalletTokens.mockResolvedValue([
      token({ id: USDC_OP, price: 1, amount: "5000000", symbol: "USDC" }),
    ]);

    const { groups, feePlan } = await scanOnOptimism();
    const fee = groups.find((group) => group.kind === "fee");
    const sweep = groups.find((group) => group.kind === "sweep");

    expect((await amountIn(fee.txns[0])).toString()).toBe(
      feePlan.feeRaw.toString(),
    );
    expect((await amountIn(sweep.txns[0])).add(feePlan.feeRaw).toString()).toBe(
      "5000000",
    );
  });

  // The row is surfaced as failed rather than swallowed, so the page can never
  // imply the wallet was emptied when its contents were never read
  it("reports the wallet token list being unavailable as a failed row", async () => {
    ethers.providers.BaseProvider.prototype.getBalance.mockResolvedValue(
      ethers.BigNumber.from("1000"),
    );
    fetchWalletTokens.mockRejectedValue(new Error("backend down"));

    const { groups, feePlan, walletScanError } = await scanOnOptimism();

    expect(walletScanError).toBeTruthy();
    // no fee when we cannot see what to charge it in
    expect(feePlan).toBeNull();
    // the rest of the exit still goes ahead
    expect(groups.some((group) => group.kind === "native")).toBe(true);
    const sweep = groups.find((group) => group.kind === "sweep");
    expect(sweep.txns).toEqual([]);
    expect(sweep.buildError).includes("backend down");
  });

  // A wallet whose only asset is worth less than the fee would otherwise pay it
  // and receive nothing
  it("charges nothing when there is nothing to hand over", async () => {
    mockUsdcOnChainBalance("400000");
    fetchWalletTokens.mockResolvedValue([
      token({ id: USDC_OP, price: 1, amount: "400000", symbol: "USDC" }),
    ]);

    const { groups, feePlan } = await scanOnOptimism();

    expect(feePlan).toBeNull();
    expect(groups.filter((group) => group.kind === "fee")).toEqual([]);
    expect(groups.filter((group) => group.txns.length > 0)).toEqual([]);
  });

  it("reuses the wallet token scan for 10 minutes", async () => {
    fetchWalletTokens.mockResolvedValue([]);

    await scanOnOptimism();
    await scanOnOptimism();

    expect(fetchWalletTokens).toHaveBeenCalledTimes(1);
    expect(fetchWalletTokens).toHaveBeenCalledWith("op", OWNER);
  });

  it("reuses the 10-minute token scan after an in-page reload", async () => {
    fetchWalletTokens.mockResolvedValue([]);

    await scanOnOptimism();
    clearAaExitWalletTokenMemoryCache();
    await scanOnOptimism();

    expect(fetchWalletTokens).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent wallet token scans", async () => {
    let resolveTokens;
    fetchWalletTokens.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTokens = resolve;
        }),
    );

    const first = scanOnOptimism();
    const second = scanOnOptimism();
    await vi.waitFor(() => expect(fetchWalletTokens).toHaveBeenCalledTimes(1));
    resolveTokens([]);

    await Promise.all([first, second]);
    expect(fetchWalletTokens).toHaveBeenCalledTimes(1);
  });

  it("refreshes the wallet token scan after 10 minutes", async () => {
    vi.useFakeTimers();
    fetchWalletTokens.mockResolvedValue([]);

    await scanOnOptimism();
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    await scanOnOptimism();

    expect(fetchWalletTokens).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("reuses the saved token snapshot when only the recipient changes", async () => {
    fetchWalletTokens.mockResolvedValue([]);

    const first = await scanOnOptimism();
    clearAaExitWalletTokenCache();
    await scanAaExit({
      owner: OWNER,
      recipient: ALT_RECIPIENT,
      chainName: "op",
      chainMetadata: optimism,
      walletTokensOverride: first.walletTokenSnapshot,
    });

    expect(first.walletTokenSnapshot).toEqual([]);
    expect(fetchWalletTokens).toHaveBeenCalledTimes(1);
  });

  it("refuses a chain it has no wallet-token mapping for", async () => {
    await expect(
      scanAaExit({
        owner: OWNER,
        recipient: RECIPIENT,
        chainName: "arbitrum",
        chainMetadata: arbitrum,
      }),
    ).resolves.toBeTruthy();
  });
});
