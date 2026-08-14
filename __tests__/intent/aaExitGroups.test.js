import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import { encode } from "thirdweb";
import { arbitrum, optimism } from "thirdweb/chains";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { fetchWalletTokens } from "../../utils/dustConversion";
import {
  AA_EXIT_WALLET_TOKEN_CACHE_HOURS,
  buildProtocolGroups,
  clearAaExitWalletTokenCache,
  clearAaExitWalletTokenMemoryCache,
  collectExitProtocols,
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

  // Two positions on one assetContract each pass a dry-run alone while asking for
  // the same loose balance, so the combined batch reverts with "transfer amount
  // exceeds balance". Only the first may sweep it.
  describe("positions sharing one assetContract", () => {
    const twoOnOneAsset = () => {
      const [first] = protocolsOn("Velodrome Vault", "op");
      const second = {
        uniqueId: `${first.uniqueId}-sibling`,
        label: `${first.label} (sibling)`,
        interface: Object.create(first.interface),
      };
      return [first, second];
    };

    it("adds the loose balance once, to the first position only", async () => {
      const protocols = twoOnOneAsset();
      protocols.forEach((protocol) =>
        stub(protocol.interface, { staked: "1000", wallet: "700" }),
      );

      const groups = await buildProtocolGroups({
        protocols,
        owner: OWNER,
        recipient: RECIPIENT,
      });

      expect(groups).toHaveLength(2);
      const amounts = await Promise.all(
        groups.map((group) => amountIn(group.txns[group.txns.length - 1])),
      );
      expect(amounts.map(String)).toEqual(["1700", "1000"]);
    });

    // Nothing is unstaked, so the amount would have been the loose balance the
    // sibling already sweeps — a second full-balance transfer of the same token
    it("produces nothing for a sibling with no separate staking contract", async () => {
      const protocols = twoOnOneAsset();
      protocols.forEach((protocol) =>
        stub(protocol.interface, { staked: "0", wallet: "700" }),
      );
      protocols.forEach((protocol) =>
        vi
          .spyOn(protocol.interface, "_unstakeLP")
          .mockResolvedValue([[], ethers.BigNumber.from("700")]),
      );

      const groups = await buildProtocolGroups({
        protocols,
        owner: OWNER,
        recipient: RECIPIENT,
      });

      expect(groups).toHaveLength(1);
      expect(groups[0].uniqueId).toBe(protocols[0].uniqueId);
      expect((await amountIn(groups[0].txns[0])).toString()).toBe("700");
    });
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

// This position is in no vault strategy, so buildProtocolGroups reaching it at
// all depends on the retired list — and these are the only assertions anywhere on
// the calldata that empties it.
describe("retired Equilibria position", () => {
  const PID_45_MARKET = "0xa877a0E177b54A37066c1786F91a1DAb68F094AF";
  const EQB_ZAP = "0xc7517f481Cc0a645e63f870830A4B2e580421e32";
  // what poolInfo(45).token returns: the receipt token EqbZap needs approved,
  // deliberately not the market LP the user ends up with
  const EQB_RECEIPT_TOKEN = "0xcf12c0268bd3038d7d811d72eb511cf3b050922c";
  // withdraw(uint256,uint256) on EqbZap, not the single-argument gauge withdraw
  const EQB_WITHDRAW_SELECTOR = ethers.utils
    .id("withdraw(uint256,uint256)")
    .slice(2, 10);
  // the amount Debank reports staked for the wallet that went unrescued
  const STAKED = "1412058125";

  const pid45 = () => {
    const protocol = collectExitProtocols("arbitrum").find(
      (candidate) => candidate.interface.pidOfEquilibria === 45,
    );
    // ethers defines contract methods as non-configurable, so the whole
    // read-only instance is swapped out
    protocol.interface.stakeFarmContractInstance = {
      functions: {
        poolInfo: vi.fn().mockResolvedValue({ token: EQB_RECEIPT_TOKEN }),
      },
    };
    return protocol;
  };

  // Matches the withdraw_action Debank proposes for this position exactly
  it("approves the receipt token, withdraws pid 45 and hands over the market LP", async () => {
    const protocol = pid45();
    stub(protocol.interface, { staked: STAKED, wallet: "0" });

    const [group] = await buildProtocolGroups({
      protocols: [protocol],
      owner: OWNER,
      recipient: RECIPIENT,
    });

    expect(group.txns).toHaveLength(3);
    expect(group.txns[0].to.toLowerCase()).toBe(EQB_RECEIPT_TOKEN);

    expect(group.txns[1].to).toBe(EQB_ZAP);
    expect(await encode(group.txns[1])).includes(EQB_WITHDRAW_SELECTOR);
    expect((await amountIn(group.txns[1])).toString()).toBe(STAKED);

    expect(await encode(group.txns[2])).includes(TRANSFER_SELECTOR);
    expect(group.txns[2].to).toBe(PID_45_MARKET);
    expect((await amountIn(group.txns[2])).toString()).toBe(STAKED);
    // the sweep must skip the market LP this hands over, not the receipt token
    expect(group.sweptAssetAddress).toBe(PID_45_MARKET);
  });

  // Every wallet that never entered this pool pays nothing for it being listed
  it("produces no row for a wallet holding none of it", async () => {
    const protocol = pid45();
    stub(protocol.interface, { staked: "0", wallet: "0" });

    expect(
      await buildProtocolGroups({
        protocols: [protocol],
        owner: OWNER,
        recipient: RECIPIENT,
      }),
    ).toEqual([]);
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

  it("reuses the wallet token scan within the cache window", async () => {
    fetchWalletTokens.mockResolvedValue([]);

    const first = await scanOnOptimism();
    const second = await scanOnOptimism();

    expect(fetchWalletTokens).toHaveBeenCalledTimes(1);
    expect(fetchWalletTokens).toHaveBeenCalledWith("op", OWNER);
    // Surfaced so the page can show whether the cache was used rather than
    // leaving it to be guessed from how long the scan felt
    expect(first.walletTokenCacheInfo.fromCache).toBe(false);
    expect(second.walletTokenCacheInfo.fromCache).toBe(true);
  });

  it("reuses the cached token scan after an in-page reload", async () => {
    fetchWalletTokens.mockResolvedValue([]);

    await scanOnOptimism();
    clearAaExitWalletTokenMemoryCache();
    await scanOnOptimism();

    expect(fetchWalletTokens).toHaveBeenCalledTimes(1);
  });

  it("re-fetches the wallet token list when the scan forces a refresh", async () => {
    fetchWalletTokens.mockResolvedValue([]);

    await scanOnOptimism();
    const refreshed = await scanAaExit({
      owner: OWNER,
      recipient: RECIPIENT,
      chainName: "op",
      chainMetadata: optimism,
      forceRefreshWalletTokens: true,
    });

    expect(fetchWalletTokens).toHaveBeenCalledTimes(2);
    expect(refreshed.walletTokenCacheInfo.fromCache).toBe(false);
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

  it("keeps serving the wallet token scan ten minutes in", async () => {
    vi.useFakeTimers();
    fetchWalletTokens.mockResolvedValue([]);

    await scanOnOptimism();
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    await scanOnOptimism();

    expect(fetchWalletTokens).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("refreshes the wallet token scan once the cache expires", async () => {
    vi.useFakeTimers();
    fetchWalletTokens.mockResolvedValue([]);

    await scanOnOptimism();
    vi.advanceTimersByTime(
      AA_EXIT_WALLET_TOKEN_CACHE_HOURS * 60 * 60 * 1000 + 1,
    );
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
