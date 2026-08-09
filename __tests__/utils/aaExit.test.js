import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import { encode } from "thirdweb";
import { arbitrum, base, optimism } from "thirdweb/chains";
import {
  AA_EXIT_VAULTS,
  EXIT_FEE_USD,
  PROTOCOL_TREASURY_ADDRESS,
  buildClaimedRewardsGroup,
  buildFeeGroup,
  buildWalletSweepGroups,
  clearPendingAaExitUserOp,
  collectExitProtocols,
  createPendingAaExitUserOp,
  debankChainCode,
  executeAaExitPlan,
  materializeExitCandidate,
  nextExitLevel,
  planAaExitBatches,
  preflightWalletTokens,
  probeAaBatch,
  readPendingAaExitUserOp,
  runAaExitGroups,
  selectFeeToken,
  sendAaExitBatch,
  sweptAddressesOf,
  usdToTokenRawFloor,
  writePendingAaExitUserOp,
} from "../../utils/aaExit";

const RECIPIENT = "0x1234567890123456789012345678901234567890";
const USDC_ARB = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const USDT_ARB = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const WETH_ARB = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
// transfer(address,uint256)
const TRANSFER_SELECTOR = "a9059cbb";
const ADMIN = "0x1111111111111111111111111111111111111111";
const SMART_ACCOUNT = "0x2222222222222222222222222222222222222222";

const token = ({
  id,
  price,
  decimals = 6,
  amount,
  symbol = "TKN",
  protocol_id = "",
}) => ({
  id,
  price,
  decimals,
  optimized_symbol: symbol,
  protocol_id,
  amount: Number(ethers.utils.formatUnits(amount, decimals)),
  raw_amount_hex_str: ethers.BigNumber.from(amount).toHexString(),
});

const address16 = (index) =>
  ethers.utils.getAddress(`0x${String(index + 1).padStart(40, "0")}`);

describe("collectExitProtocols", () => {
  it("returns every protocol on the chain exactly once", () => {
    const protocols = collectExitProtocols("arbitrum");
    const uniqueIds = protocols.map((protocol) => protocol.uniqueId);

    expect(uniqueIds.length).toBeGreaterThan(0);
    expect(new Set(uniqueIds).size).toBe(uniqueIds.length);
  });

  it("dedupes Camelot by its shared NFT manager and sweeps it generically", () => {
    const camelot = collectExitProtocols("arbitrum").filter(
      (protocol) => protocol.interface.protocolName === "camelot",
    );

    expect(camelot).toHaveLength(1);
    expect(camelot[0].uniqueId).toBe("arbitrum/camelot/v3/all-positions");
    expect(camelot[0].label).toBe("Camelot V3 positions");
  });

  // Index 500+ imports Stable+, ETH and BTC wholesale, so a naive walk would
  // emit the same position several times and transfer more than the user holds
  it("dedupes positions the index vaults re-import", () => {
    const protocols = collectExitProtocols("arbitrum");
    const stableIds = new Set(
      collectExitProtocols("arbitrum")
        .filter((protocol) => protocol.uniqueId.includes("/equilibria/"))
        .map((protocol) => protocol.uniqueId),
    );

    stableIds.forEach((uniqueId) => {
      expect(
        protocols.filter((protocol) => protocol.uniqueId === uniqueId),
      ).toHaveLength(1);
    });
  });

  // Deprecated protocols get their weight zeroed while still holding funds,
  // which is exactly who needs this page
  it("keeps protocols whose weight is zero", () => {
    const onOptimism = collectExitProtocols("op");

    expect(onOptimism.length).toBeGreaterThan(0);
    onOptimism.forEach((protocol) =>
      expect(protocol.uniqueId.startsWith("op/")).toBe(true),
    );
  });

  it("only reaches vaults a user can actually enter", () => {
    const uniqueIds = collectExitProtocols("arbitrum").map((p) => p.uniqueId);

    // Yearn and Interport live in test-only vaults and have no _unstake at all
    expect(uniqueIds.some((id) => id.includes("/yearn/"))).toBe(false);
    expect(uniqueIds.some((id) => id.includes("/interport/"))).toBe(false);
    expect(AA_EXIT_VAULTS).not.toContain("Yearn Vault");
  });

  it("returns nothing for a chain no vault covers", () => {
    expect(collectExitProtocols("metis")).toEqual([]);
  });
});

describe("debankChainCode", () => {
  it("maps the three supported chains and refuses the rest", () => {
    expect(debankChainCode("arbitrum")).toBe("arb");
    expect(debankChainCode("base")).toBe("base");
    expect(debankChainCode("op")).toBe("op");
    // building a URL the backend answers with an error would look like an empty
    // wallet rather than a failure
    expect(() => debankChainCode("optimism")).toThrow();
  });
});

describe("usdToTokenRawFloor", () => {
  it("converts at the quoted price", () => {
    expect(usdToTokenRawFloor(1, 1, 6).toString()).toBe("1000000");
    expect(usdToTokenRawFloor(1, 2500, 18).toString()).toBe("400000000000000");
  });

  // Truncation, not rounding: the fee may come out under a dollar, never over
  it("always rounds down", () => {
    // 1 / 0.9999 = 1.00010001... -> 1.000100 at 6 decimals
    expect(usdToTokenRawFloor(1, 0.9999, 6).toString()).toBe("1000100");
    // 1 / 3 = 0.333333... -> 0.33 at 2 decimals, never 0.34
    expect(usdToTokenRawFloor(1, 3, 2).toString()).toBe("33");
  });

  it("returns zero for prices and decimals it cannot use", () => {
    expect(usdToTokenRawFloor(1, 0, 6).isZero()).toBe(true);
    expect(usdToTokenRawFloor(1, undefined, 6).isZero()).toBe(true);
    expect(usdToTokenRawFloor(1, -5, 6).isZero()).toBe(true);
    expect(usdToTokenRawFloor(1, 1, undefined).isZero()).toBe(true);
    // a price so small that a dollar's worth rounds away entirely
    expect(usdToTokenRawFloor(1, 1e-30, 0).isZero()).toBe(true);
  });
});

describe("selectFeeToken", () => {
  it("prefers a stablecoin that can cover the whole fee", () => {
    const plan = selectFeeToken({
      walletTokens: [
        token({
          id: WETH_ARB,
          price: 2500,
          decimals: 18,
          amount: "10" + "0".repeat(18),
          symbol: "WETH",
        }),
        token({ id: USDC_ARB, price: 1, amount: "5000000", symbol: "USDC" }),
      ],
    });

    expect(plan.symbol).toBe("USDC");
    expect(plan.feeRaw.toString()).toBe("1000000");
    expect(plan.coversFee).toBe(true);
  });

  // Charging in something is better than waiving the fee
  it("falls back to the largest priced token when no stablecoin qualifies", () => {
    const plan = selectFeeToken({
      walletTokens: [
        token({
          id: WETH_ARB,
          price: 2500,
          decimals: 18,
          amount: "1" + "0".repeat(18),
          symbol: "WETH",
        }),
        token({ id: USDT_ARB, price: 12, amount: "3000000", symbol: "MEME" }),
      ],
    });

    expect(plan.symbol).toBe("WETH");
    expect(plan.feeRaw.toString()).toBe("400000000000000");
  });

  // A stablecoin holding less than a dollar would undercharge; the token that
  // can actually pay the fee wins over the one that merely looks stable
  it("prefers covering the fee over being a stablecoin", () => {
    const plan = selectFeeToken({
      walletTokens: [
        token({ id: USDC_ARB, price: 1, amount: "300000", symbol: "USDC" }),
        token({
          id: WETH_ARB,
          price: 2500,
          decimals: 18,
          amount: "1" + "0".repeat(18),
          symbol: "WETH",
        }),
      ],
    });

    expect(plan.symbol).toBe("WETH");
  });

  it("never asks for more than the wallet holds", () => {
    const plan = selectFeeToken({
      walletTokens: [
        token({ id: USDC_ARB, price: 1, amount: "400000", symbol: "USDC" }),
      ],
    });

    expect(plan.feeRaw.toString()).toBe("400000");
    expect(plan.coversFee).toBe(false);
  });

  it("skips native, unpriced and protocol-swept tokens", () => {
    expect(
      selectFeeToken({
        walletTokens: [
          // native is listed under a chain code, not an address
          token({
            id: "arb",
            price: 2500,
            decimals: 18,
            amount: "1" + "0".repeat(18),
          }),
          token({ id: USDC_ARB, price: 0, amount: "5000000" }),
          token({ id: USDT_ARB, price: undefined, amount: "5000000" }),
          token({
            id: WETH_ARB,
            price: 2500,
            decimals: 18,
            amount: "1" + "0".repeat(18),
          }),
        ],
        excludeAddresses: new Set([WETH_ARB.toLowerCase()]),
      }),
    ).toBeNull();
  });

  it("returns null when the wallet holds nothing priceable", () => {
    expect(selectFeeToken({ walletTokens: [] })).toBeNull();
    expect(selectFeeToken({ walletTokens: undefined })).toBeNull();
  });
});

describe("sweptAddressesOf", () => {
  // A protocol that failed to build moves nothing, so its token must stay
  // eligible for the wallet sweep
  it("only counts groups that produced transactions", () => {
    const swept = sweptAddressesOf([
      { txns: ["a"], buildError: null, sweptAssetAddress: USDC_ARB },
      { txns: [], buildError: "boom", sweptAssetAddress: USDT_ARB },
      { txns: ["c"], buildError: null, sweptAssetAddress: null },
    ]);

    expect(swept).toEqual(new Set([USDC_ARB.toLowerCase()]));
  });
});

describe("preflightWalletTokens", () => {
  const OWNER = "0xd33668a245da0D1d00e9e651F93939da09B4Fd9d";

  it("keeps a token that can transfer and refreshes its on-chain balance", async () => {
    const iface = new ethers.utils.Interface([
      "function balanceOf(address owner) view returns (uint256)",
    ]);
    const provider = {
      call: vi
        .fn()
        .mockResolvedValueOnce(
          iface.encodeFunctionResult("balanceOf", [ethers.BigNumber.from(7)]),
        )
        .mockResolvedValueOnce("0x"),
    };
    const onTokenScanned = vi.fn();

    const result = await preflightWalletTokens({
      walletTokens: [token({ id: USDC_ARB, price: 1, amount: "1000000" })],
      owner: OWNER,
      recipient: RECIPIENT,
      chainName: "arbitrum",
      provider,
      onTokenScanned,
    });

    expect(result.untransferableTokens).toEqual([]);
    expect(result.walletTokens).toHaveLength(1);
    expect(result.walletTokens[0].raw_amount_hex_str).toBe("0x07");
    expect(provider.call).toHaveBeenCalledTimes(2);
    expect(provider.call.mock.calls[1][0].from).toBe(OWNER);
    expect(onTokenScanned).toHaveBeenNthCalledWith(1, {
      completed: 0,
      total: 1,
    });
    expect(onTokenScanned).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        completed: 1,
        total: 1,
        transferable: true,
      }),
    );
  });

  it("excludes hostile tokens whose transfer simulation reverts", async () => {
    const iface = new ethers.utils.Interface([
      "function balanceOf(address owner) view returns (uint256)",
    ]);
    const provider = {
      call: vi
        .fn()
        .mockResolvedValueOnce(
          iface.encodeFunctionResult("balanceOf", [ethers.BigNumber.from(1)]),
        )
        .mockRejectedValueOnce(
          new Error(
            "execution reverted: ERC20: transfer amount exceeds balance",
          ),
        ),
    };

    const result = await preflightWalletTokens({
      walletTokens: [
        token({ id: USDC_ARB, price: 0, amount: "1", symbol: "SPAM" }),
      ],
      owner: OWNER,
      recipient: RECIPIENT,
      chainName: "arbitrum",
      provider,
    });

    expect(result.walletTokens).toEqual([]);
    expect(result.untransferableTokens).toEqual([
      expect.objectContaining({
        address: USDC_ARB.toLowerCase(),
        symbol: "SPAM",
        reason: expect.stringContaining("transfer amount exceeds balance"),
      }),
    ]);
  });

  it("does not use price or symbol as a transferability filter", async () => {
    const iface = new ethers.utils.Interface([
      "function balanceOf(address owner) view returns (uint256)",
    ]);
    const provider = {
      call: vi
        .fn()
        .mockResolvedValueOnce(
          iface.encodeFunctionResult("balanceOf", [ethers.BigNumber.from(5)]),
        )
        .mockResolvedValueOnce("0x"),
    };

    const result = await preflightWalletTokens({
      walletTokens: [
        token({ id: USDT_ARB, price: 0, amount: "5", symbol: "WEIRD/TOKEN" }),
      ],
      owner: OWNER,
      recipient: RECIPIENT,
      chainName: "arbitrum",
      provider,
    });

    expect(result.walletTokens).toHaveLength(1);
  });
});

describe("buildWalletSweepGroups", () => {
  const base = { chainMetadata: arbitrum, recipient: RECIPIENT };

  it("sweeps every loose token and skips native and swept addresses", async () => {
    const [group] = buildWalletSweepGroups({
      ...base,
      walletTokens: [
        token({ id: USDC_ARB, price: 1, amount: "5000000" }),
        token({ id: "arb", price: 2500, decimals: 18, amount: "1" }),
        token({ id: WETH_ARB, price: 2500, decimals: 18, amount: "1" }),
      ],
      excludeAddresses: new Set([WETH_ARB.toLowerCase()]),
    });

    expect(group.txns).toHaveLength(1);
    const data = await encode(group.txns[0]);
    expect(data).includes(TRANSFER_SELECTOR);
    expect(data.toLowerCase()).includes(RECIPIENT.slice(2).toLowerCase());
  });

  // Fee + a full-balance sweep of the same token asks for more than the wallet
  // holds, which reverts the whole atomic batch
  it("sweeps the fee token short by exactly the fee", async () => {
    const walletTokens = [token({ id: USDC_ARB, price: 1, amount: "5000000" })];
    const feePlan = selectFeeToken({ walletTokens });
    const [group] = buildWalletSweepGroups({ ...base, walletTokens, feePlan });

    const data = await encode(group.txns[0]);
    const swept = ethers.BigNumber.from(`0x${data.slice(-64)}`);
    expect(swept.toString()).toBe("4000000");
    expect(swept.add(feePlan.feeRaw).toString()).toBe("5000000");
  });

  it("drops a token the fee consumes entirely", () => {
    const walletTokens = [token({ id: USDC_ARB, price: 1, amount: "400000" })];
    const feePlan = selectFeeToken({ walletTokens });

    expect(
      buildWalletSweepGroups({ ...base, walletTokens, feePlan }),
    ).toHaveLength(0);
  });

  it("aggregates duplicate addresses", async () => {
    const [group] = buildWalletSweepGroups({
      ...base,
      walletTokens: [
        token({ id: USDC_ARB, price: 1, amount: "1000000" }),
        token({
          id: USDC_ARB.toUpperCase().replace("0X", "0x"),
          price: 1,
          amount: "2000000",
        }),
      ],
    });

    expect(group.txns).toHaveLength(1);
    const data = await encode(group.txns[0]);
    expect(ethers.BigNumber.from(`0x${data.slice(-64)}`).toString()).toBe(
      "3000000",
    );
  });

  it("skips a balance it cannot read without losing the rest", () => {
    const [group] = buildWalletSweepGroups({
      ...base,
      walletTokens: [
        { id: USDT_ARB, price: 1, decimals: 6, raw_amount_hex_str: "not-hex" },
        token({ id: USDC_ARB, price: 1, amount: "1000000" }),
      ],
    });

    expect(group.txns).toHaveLength(1);
  });

  // One blacklisted airdrop token then costs its chunk of ten, not the sweep
  it("chunks into batches of ten", () => {
    const groups = buildWalletSweepGroups({
      ...base,
      walletTokens: Array.from({ length: 11 }, (_, index) =>
        token({ id: address16(index), price: 1, amount: "1000000" }),
      ),
    });

    expect(groups.map((group) => group.txns.length)).toEqual([10, 1]);
    expect(groups.map((group) => group.uniqueId)).toEqual([
      "wallet-tokens-1",
      "wallet-tokens-2",
    ]);
  });
});

describe("buildFeeGroup", () => {
  it("sends the fee to the treasury", async () => {
    const feePlan = selectFeeToken({
      walletTokens: [
        token({ id: USDC_ARB, price: 1, amount: "5000000", symbol: "USDC" }),
      ],
    });
    const group = buildFeeGroup({ feePlan, chainMetadata: arbitrum });

    expect(group.uniqueId).toBe("exit-fee");
    expect(group.label).includes(`$${EXIT_FEE_USD}`);
    const data = await encode(group.txns[0]);
    expect(data.toLowerCase()).includes(
      PROTOCOL_TREASURY_ADDRESS.slice(2).toLowerCase(),
    );
  });

  it("builds nothing without a fee plan", () => {
    expect(
      buildFeeGroup({ feePlan: null, chainMetadata: arbitrum }),
    ).toBeNull();
  });
});

describe("buildClaimedRewardsGroup", () => {
  const rewardBalances = [
    { address: USDC_ARB, balance: ethers.BigNumber.from("1000") },
  ];
  const base = { chainMetadata: optimism, recipient: RECIPIENT };

  it("sums rewards from groups that still carry their claim", () => {
    const group = buildClaimedRewardsGroup({
      ...base,
      protocolGroups: [
        { level: 0, buildError: null, rewardBalances },
        { level: 0, buildError: null, rewardBalances },
      ],
    });

    expect(group.txns).toHaveLength(1);
  });

  // A protocol retried without its claim never delivers those rewards, so
  // transferring them would revert
  it("drops rewards from a protocol that degraded to no-claim", () => {
    expect(
      buildClaimedRewardsGroup({
        ...base,
        protocolGroups: [{ level: 1, buildError: null, rewardBalances }],
      }),
    ).toBeNull();
  });

  it("drops rewards from a protocol that failed or was cancelled", () => {
    expect(
      buildClaimedRewardsGroup({
        ...base,
        protocolGroups: [
          { level: 0, buildError: "boom", rewardBalances },
          { level: 0, buildError: null, status: "failed", rewardBalances },
          { level: 0, buildError: null, status: "cancelled", rewardBalances },
        ],
      }),
    ).toBeNull();
  });

  it("keeps rewards from a claim that landed", () => {
    expect(
      buildClaimedRewardsGroup({
        ...base,
        protocolGroups: [
          { level: 0, buildError: null, status: "success", rewardBalances },
        ],
      }),
    ).not.toBeNull();
  });
});

describe("nextExitLevel", () => {
  it("shrinks protocols twice, sweeps once, and never splits a single txn", () => {
    expect(nextExitLevel({ kind: "protocol", level: 0 })).toBe(1);
    expect(nextExitLevel({ kind: "protocol", level: 1 })).toBe(2);
    expect(nextExitLevel({ kind: "protocol", level: 2 })).toBeNull();
    expect(nextExitLevel({ kind: "sweep", level: 0 })).toBe(2);
    expect(nextExitLevel({ kind: "rewards", level: 0 })).toBe(2);
    expect(nextExitLevel({ kind: "fee", level: 0 })).toBeNull();
    expect(nextExitLevel({ kind: "native", level: 0 })).toBeNull();
  });
});

describe("runAaExitGroups", () => {
  const groupsOf = (...overrides) =>
    overrides.map((override, index) => ({
      kind: "protocol",
      uniqueId: `p${index}`,
      label: `protocol ${index}`,
      level: 0,
      dependent: true,
      txns: [`txn-${index}`],
      buildError: null,
      ...override,
    }));

  const runner = ({ groups, send, rebuildGroup, ...rest }) => {
    const statuses = {};
    const updateGroup = vi.fn((uniqueId, patch) => {
      statuses[uniqueId] = { ...statuses[uniqueId], ...patch };
    });
    const sendBatchTransaction = vi.fn(send);
    return {
      statuses,
      updateGroup,
      sendBatchTransaction,
      promise: runAaExitGroups({
        groups,
        sendBatchTransaction,
        updateGroup,
        rebuildGroup,
        ...rest,
      }),
    };
  };

  const succeed =
    (hash = "0xhash") =>
    (_calls, callbacks) =>
      callbacks.onSuccess({ transactionHash: hash });
  const failWith = (error) => (_calls, callbacks) => callbacks.onError(error);

  it("sends every group in one batch and marks them all done", async () => {
    const harness = runner({
      groups: groupsOf({}, {}),
      send: succeed("0xcombined"),
    });
    const result = await harness.promise;

    expect(result.status).toBe("success");
    expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(1);
    expect(harness.sendBatchTransaction.mock.calls[0][0]).toEqual([
      "txn-0",
      "txn-1",
    ]);
    expect(harness.statuses.p0.status).toBe("success");
    expect(harness.statuses.p1.transactionHash).toBe("0xcombined");
  });

  it("cancels everything when the user rejects", async () => {
    const harness = runner({
      groups: groupsOf({}, {}),
      send: failWith({ code: 4001, message: "user rejected" }),
    });
    const result = await harness.promise;

    expect(result.status).toBe("cancelled");
    expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(1);
  });

  // Retrying something that may already have been submitted could exit twice
  it("stops without retrying when the batch status is unknown", async () => {
    const harness = runner({
      groups: groupsOf({}, {}),
      send: failWith(new Error("timeout waiting for userop hash")),
    });
    const result = await harness.promise;

    expect(result.status).toBe("unknown");
    expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(1);
    expect(harness.statuses.p1.status).toBe("unknown");
  });

  it("falls back to one group per batch after a safe failure", async () => {
    let call = 0;
    const onFallback = vi.fn();
    const harness = runner({
      groups: groupsOf({}, {}),
      onFallback,
      rebuildGroup: async (group) => group,
      send: (calls, callbacks) => {
        call += 1;
        return call === 1
          ? callbacks.onError(new Error("UserOperation reverted"))
          : callbacks.onSuccess({ transactionHash: `0x${call}` });
      },
    });
    const result = await harness.promise;

    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("completed-with-groups");
    expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(3);
    expect(harness.statuses.p0.status).toBe("success");
    expect(harness.statuses.p1.status).toBe("success");
  });

  it("stops the whole run when one group's status is unknown", async () => {
    let call = 0;
    const harness = runner({
      groups: groupsOf({}, {}),
      rebuildGroup: async (group) => group,
      send: (calls, callbacks) => {
        call += 1;
        if (call === 1) return callbacks.onError(new Error("reverted"));
        return callbacks.onError(new Error("network connection lost"));
      },
    });
    const result = await harness.promise;

    expect(result.status).toBe("unknown");
    expect(harness.statuses.p0.status).toBe("unknown");
    // the second group was never attempted
    expect(harness.statuses.p1.status).toBe("pending");
  });

  // The point of the whole design: fewer transactions per batch each round
  it("degrades a protocol from full to no-claim to one txn at a time", async () => {
    const levels = [];
    const rebuildGroup = vi.fn(async (group, level) => {
      levels.push(level);
      return level === 1
        ? { ...group, txns: ["approve", "withdraw", "transfer"] }
        : group;
    });
    let call = 0;
    const harness = runner({
      groups: groupsOf({}),
      rebuildGroup,
      send: (calls, callbacks) => {
        call += 1;
        // combined, then the group at level 0, then the group at level 1
        return call <= 3
          ? callbacks.onError(new Error("reverted"))
          : callbacks.onSuccess({ transactionHash: `0x${call}` });
      },
    });
    const result = await harness.promise;

    expect(levels).toEqual([1, 2]);
    expect(result.status).toBe("completed-with-groups");
    // level 2 sends the three transactions separately
    expect(
      harness.sendBatchTransaction.mock.calls.slice(3).map(([calls]) => calls),
    ).toEqual([["approve"], ["withdraw"], ["transfer"]]);
    expect(harness.statuses.p0.status).toBe("success");
    expect(harness.statuses.p0.progress).toBe("3/3");
  });

  // Reporting 0/3 when two transfers already landed would send the user looking
  // for money that has arrived
  it("reports what already landed when a split run is cancelled part way", async () => {
    let call = 0;
    const harness = runner({
      groups: groupsOf({
        kind: "sweep",
        dependent: false,
        level: 2,
        txns: ["a", "b", "c"],
      }),
      combinedAllowed: false,
      send: (calls, callbacks) => {
        call += 1;
        return call === 3
          ? callbacks.onError({ code: 4001, message: "user rejected" })
          : callbacks.onSuccess({ transactionHash: `0x${call}` });
      },
    });
    const result = await harness.promise;

    expect(result.status).toBe("cancelled");
    expect(harness.statuses.p0.progress).toBe("2/3");
  });

  // approve -> withdraw -> transfer cannot continue past a failure
  it("abandons the rest of a dependent chain when a split txn fails", async () => {
    const harness = runner({
      groups: groupsOf({ level: 2, txns: ["approve", "withdraw", "transfer"] }),
      combinedAllowed: false,
      send: failWith(new Error("reverted")),
    });
    const result = await harness.promise;

    expect(result.status).toBe("completed-with-groups");
    expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(1);
    expect(harness.statuses.p0.status).toBe("failed");
  });

  it("keeps going through independent split txns", async () => {
    let call = 0;
    const harness = runner({
      groups: groupsOf({
        kind: "sweep",
        dependent: false,
        level: 2,
        txns: ["a", "b", "c"],
      }),
      combinedAllowed: false,
      send: (calls, callbacks) => {
        call += 1;
        return call === 2
          ? callbacks.onError(new Error("reverted"))
          : callbacks.onSuccess({ transactionHash: `0x${call}` });
      },
    });
    const result = await harness.promise;

    expect(result.status).toBe("completed-with-groups");
    expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(3);
    expect(harness.statuses.p0.status).toBe("partial");
    expect(harness.statuses.p0.progress).toBe("2/3");
  });

  it("recomputes the rewards group just before sending it", async () => {
    const rebuildGroup = vi.fn(async (group) =>
      group.kind === "rewards" ? { ...group, txns: [] } : group,
    );
    const harness = runner({
      groups: [
        ...groupsOf({}),
        {
          kind: "rewards",
          uniqueId: "claimed-rewards",
          label: "Claimed rewards",
          level: 0,
          dependent: false,
          txns: ["reward-transfer"],
          buildError: null,
        },
      ],
      rebuildGroup,
      combinedAllowed: false,
      send: succeed(),
    });
    await harness.promise;

    expect(
      rebuildGroup.mock.calls.some(([group]) => group.kind === "rewards"),
    ).toBe(true);
    // emptied by the rebuild, so nothing was sent for it
    expect(harness.statuses["claimed-rewards"].status).toBe("success");
    expect(harness.statuses["claimed-rewards"].note).includes("nothing left");
    expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(1);
  });

  it("never degrades or resends the fee", async () => {
    const rebuildGroup = vi.fn(async (group) => group);
    const harness = runner({
      groups: [
        {
          kind: "fee",
          uniqueId: "exit-fee",
          label: "Gas fee",
          level: 0,
          dependent: false,
          txns: ["fee-transfer"],
          buildError: null,
        },
      ],
      rebuildGroup,
      combinedAllowed: false,
      send: failWith(new Error("reverted")),
    });
    const result = await harness.promise;

    expect(result.status).toBe("completed-with-groups");
    expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(1);
    expect(rebuildGroup).not.toHaveBeenCalled();
    expect(harness.statuses["exit-fee"].status).toBe("failed");
  });

  it("skips the combined attempt for a single-row retry", async () => {
    const harness = runner({
      groups: groupsOf({}),
      combinedAllowed: false,
      send: succeed(),
    });
    await harness.promise;

    expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(1);
    expect(harness.sendBatchTransaction.mock.calls[0][0]).toEqual(["txn-0"]);
  });

  it("reports a group that could not be built without sending it", async () => {
    const harness = runner({
      groups: groupsOf({ txns: [], buildError: "could not read balance" }),
      send: succeed(),
    });
    const result = await harness.promise;

    expect(result.status).toBe("completed-with-groups");
    expect(harness.sendBatchTransaction).not.toHaveBeenCalled();
    expect(harness.statuses.p0.error).toBe("could not read balance");
  });

  it("returns the level each group ended on so a retry can continue", async () => {
    const rebuildGroup = vi.fn(async (group) => group);
    const harness = runner({
      groups: groupsOf({}),
      rebuildGroup,
      send: failWith(new Error("reverted")),
    });
    const result = await harness.promise;

    expect(result.groups[0].level).toBe(2);
  });
});

describe("staged AA Exit submission", () => {
  const adminAccount = { address: ADMIN };
  const client = { clientId: "test-client" };
  const userOpHash = `0x${"a".repeat(64)}`;
  const transactionHash = `0x${"b".repeat(64)}`;
  const unsignedUserOp = {
    sender: SMART_ACCOUNT,
    nonce: 0n,
    signature: "0x",
  };
  const signedUserOp = { ...unsignedUserOp, signature: "0x1234" };

  const transactionFor = (chainMetadata) => ({
    chain: chainMetadata,
    to: RECIPIENT,
    data: "0x",
  });

  const senderDependencies = (overrides = {}) => ({
    prepareUserOpFn: vi.fn().mockResolvedValue(unsignedUserOp),
    signUserOpFn: vi.fn().mockResolvedValue(signedUserOp),
    getUserOpHashFn: vi.fn().mockResolvedValue(userOpHash),
    bundleUserOpFn: vi.fn().mockResolvedValue(userOpHash),
    waitForUserOpReceiptFn: vi.fn().mockResolvedValue({ transactionHash }),
    ...overrides,
  });

  const sendWith = ({
    chainMetadata = arbitrum,
    dependencies = senderDependencies(),
    onStage = vi.fn(),
    transactions = [transactionFor(chainMetadata)],
  } = {}) => ({
    dependencies,
    onStage,
    promise: sendAaExitBatch({
      transactions,
      adminAccount,
      chainMetadata,
      expectedSmartAccountAddress: SMART_ACCOUNT,
      client,
      onStage,
      ...dependencies,
    }),
  });

  it("prepares, signs, submits and confirms on all supported chains", async () => {
    for (const chainMetadata of [arbitrum, base, optimism]) {
      const transaction = transactionFor(chainMetadata);
      const dependencies = senderDependencies();
      const onStage = vi.fn();
      const { promise } = sendWith({
        chainMetadata,
        dependencies,
        onStage,
        transactions: [transaction],
      });

      await expect(promise).resolves.toMatchObject({
        userOpHash,
        transactionHash,
      });
      expect(dependencies.prepareUserOpFn).toHaveBeenCalledWith(
        expect.objectContaining({
          transactions: [transaction],
          adminAccount,
          client,
          smartWalletOptions: {
            chain: chainMetadata,
            sponsorGas: true,
          },
          waitForDeployment: false,
        }),
      );
      expect(dependencies.signUserOpFn).toHaveBeenCalledWith({
        userOp: unsignedUserOp,
        adminAccount,
        chain: chainMetadata,
        client,
      });
      expect(dependencies.getUserOpHashFn).toHaveBeenCalledWith({
        userOp: signedUserOp,
        chain: chainMetadata,
        client,
      });
      expect(dependencies.bundleUserOpFn).toHaveBeenCalledWith({
        userOp: signedUserOp,
        options: { chain: chainMetadata, client },
      });
      expect(dependencies.waitForUserOpReceiptFn).toHaveBeenCalledWith({
        chain: chainMetadata,
        client,
        userOpHash,
      });
      expect(onStage.mock.calls.map(([event]) => event)).toEqual([
        { stage: "preparing" },
        { stage: "signing" },
        { stage: "submitting", userOpHash },
        { stage: "submitted", userOpHash },
        { stage: "confirmed", userOpHash, transactionHash },
      ]);
    }
  });

  it("marks prepare failures as definitely not submitted", async () => {
    const dependencies = senderDependencies({
      prepareUserOpFn: vi.fn().mockRejectedValue(new Error("prepare failed")),
    });
    const { promise } = sendWith({ dependencies });

    await expect(promise).rejects.toMatchObject({
      message: "prepare failed",
      stage: "preparing",
      submitted: false,
    });
    expect(dependencies.signUserOpFn).not.toHaveBeenCalled();
    expect(dependencies.bundleUserOpFn).not.toHaveBeenCalled();
  });

  it("marks signature failures as definitely not submitted", async () => {
    const dependencies = senderDependencies({
      signUserOpFn: vi.fn().mockRejectedValue(new Error("signature failed")),
    });
    const { promise } = sendWith({ dependencies });

    await expect(promise).rejects.toMatchObject({
      message: "signature failed",
      stage: "signing",
      submitted: false,
    });
    expect(dependencies.getUserOpHashFn).not.toHaveBeenCalled();
    expect(dependencies.bundleUserOpFn).not.toHaveBeenCalled();
  });

  it("does not submit when the deterministic UserOp hash cannot be calculated", async () => {
    const dependencies = senderDependencies({
      getUserOpHashFn: vi
        .fn()
        .mockRejectedValue(new Error("could not calculate UserOp hash")),
    });
    const { promise } = sendWith({ dependencies });

    await expect(promise).rejects.toMatchObject({
      message: "could not calculate UserOp hash",
      stage: "signing",
      submitted: false,
    });
    expect(dependencies.bundleUserOpFn).not.toHaveBeenCalled();
  });

  it("does not expose a hash when the bundler explicitly rejects the UserOp", async () => {
    const dependencies = senderDependencies({
      bundleUserOpFn: vi
        .fn()
        .mockRejectedValue(
          new Error(
            "eth_sendUserOperation error: AA23 reverted\nStatus: 400\nCode: UNKNOWN",
          ),
        ),
    });
    const { promise } = sendWith({ dependencies });
    const error = await promise.catch((caught) => caught);

    expect(error).toMatchObject({
      message:
        "eth_sendUserOperation error: AA23 reverted\nStatus: 400\nCode: UNKNOWN",
      stage: "submitting",
      submitted: false,
    });
    expect(error.userOpHash).toBeUndefined();
    expect(dependencies.waitForUserOpReceiptFn).not.toHaveBeenCalled();
  });

  it("preserves the local hash for a 5xx eth_sendUserOperation response", async () => {
    const dependencies = senderDependencies({
      bundleUserOpFn: vi
        .fn()
        .mockRejectedValue(
          new Error(
            "eth_sendUserOperation error: gateway timeout\nStatus: 504\nCode: UNKNOWN",
          ),
        ),
    });
    const { promise } = sendWith({ dependencies });

    await expect(promise).rejects.toMatchObject({
      stage: "submitting",
      submitted: true,
      submissionUnknown: true,
      userOpHash,
    });
  });

  it("preserves the local hash when a bundler transport failure may have submitted", async () => {
    const dependencies = senderDependencies({
      bundleUserOpFn: vi
        .fn()
        .mockRejectedValue(new Error("network connection reset")),
    });
    const onStage = vi.fn();
    const { promise } = sendWith({ dependencies, onStage });

    await expect(promise).rejects.toMatchObject({
      message: "network connection reset",
      stage: "submitting",
      submitted: true,
      submissionUnknown: true,
      userOpHash,
    });
    expect(onStage).toHaveBeenLastCalledWith({
      stage: "submitted",
      userOpHash,
      submissionUnknown: true,
    });
    expect(dependencies.waitForUserOpReceiptFn).not.toHaveBeenCalled();
  });

  it("treats a bundler hash mismatch as submitted but unsafe to retry", async () => {
    const returnedHash = `0x${"e".repeat(64)}`;
    const dependencies = senderDependencies({
      bundleUserOpFn: vi.fn().mockResolvedValue(returnedHash),
    });
    const { promise } = sendWith({ dependencies });

    await expect(promise).rejects.toMatchObject({
      message: expect.stringContaining(`returned ${returnedHash}`),
      stage: "submitting",
      submitted: true,
      submissionUnknown: true,
      userOpHash,
    });
    expect(dependencies.waitForUserOpReceiptFn).not.toHaveBeenCalled();
  });

  it("treats a missing bundler hash as submitted but unsafe to retry", async () => {
    const dependencies = senderDependencies({
      bundleUserOpFn: vi.fn().mockResolvedValue(undefined),
    });
    const { promise } = sendWith({ dependencies });

    await expect(promise).rejects.toMatchObject({
      message: expect.stringContaining("returned no UserOp hash"),
      stage: "submitting",
      submitted: true,
      submissionUnknown: true,
      userOpHash,
    });
    expect(dependencies.waitForUserOpReceiptFn).not.toHaveBeenCalled();
  });

  it("keeps the UserOp hash when receipt polling times out after submission", async () => {
    const dependencies = senderDependencies({
      waitForUserOpReceiptFn: vi
        .fn()
        .mockRejectedValue(new Error("Timeout waiting for userOp")),
    });
    const { promise } = sendWith({ dependencies });

    await expect(promise).rejects.toMatchObject({
      message: "Timeout waiting for userOp",
      stage: "submitted",
      submitted: true,
      userOpHash,
    });
    expect(dependencies.bundleUserOpFn).toHaveBeenCalledTimes(1);
  });

  it("refuses an unexpected prepared sender before asking for a signature", async () => {
    const dependencies = senderDependencies({
      prepareUserOpFn: vi.fn().mockResolvedValue({
        ...unsignedUserOp,
        sender: "0x3333333333333333333333333333333333333333",
      }),
    });
    const { promise } = sendWith({ dependencies });

    await expect(promise).rejects.toMatchObject({
      message: expect.stringContaining("smart wallet mismatch"),
      stage: "preparing",
      submitted: false,
    });
    expect(dependencies.signUserOpFn).not.toHaveBeenCalled();
    expect(dependencies.bundleUserOpFn).not.toHaveBeenCalled();
  });

  it("refuses to mix a Base transaction into an Arbitrum batch", async () => {
    const dependencies = senderDependencies();
    const { promise } = sendWith({
      dependencies,
      transactions: [transactionFor(base)],
    });

    await expect(promise).rejects.toMatchObject({
      message: expect.stringContaining("refused a cross-chain batch"),
      submitted: false,
    });
    expect(dependencies.prepareUserOpFn).not.toHaveBeenCalled();
    expect(dependencies.bundleUserOpFn).not.toHaveBeenCalled();
  });
});

describe("pending AA Exit UserOp storage", () => {
  const smartAccountAddress = "0xB45AF3F83e8919e740980dc8592926936E34F01D";
  const normalizedAddress = smartAccountAddress.toLowerCase();
  const userOpHash = `0x${"c".repeat(64)}`;
  const storageKey = `aa-exit-pending-userop:v1:${arbitrum.id}:${normalizedAddress}`;

  const memoryStorage = () => {
    const values = new Map();
    return {
      values,
      getItem: vi.fn((key) => values.get(key) ?? null),
      setItem: vi.fn((key, value) => values.set(key, value)),
      removeItem: vi.fn((key) => values.delete(key)),
    };
  };

  const pendingRecord = (overrides = {}) =>
    createPendingAaExitUserOp({
      chainId: arbitrum.id,
      smartAccountAddress,
      recipient: RECIPIENT,
      userOpHash,
      groupIds: ["protocol-a", "exit-fee"],
      batchIndex: 1,
      batchCount: 3,
      createdAt: 1_700_000_000_000,
      ...overrides,
    });

  it("normalizes the address and round-trips a pending batch", () => {
    const storage = memoryStorage();
    const record = pendingRecord();

    expect(record).toEqual({
      version: 1,
      chainId: arbitrum.id,
      smartAccountAddress: normalizedAddress,
      recipient: RECIPIENT,
      userOpHash,
      groupIds: ["protocol-a", "exit-fee"],
      batchIndex: 1,
      batchCount: 3,
      createdAt: 1_700_000_000_000,
    });

    writePendingAaExitUserOp(record, { storage });

    expect(storage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(record),
    );
    expect(
      readPendingAaExitUserOp({
        chainId: arbitrum.id,
        smartAccountAddress,
        storage,
      }),
    ).toEqual(record);
  });

  it("removes corrupt and mismatched records instead of restoring them", () => {
    const invalidRecords = [
      "{not-json",
      JSON.stringify({ ...pendingRecord(), chainId: base.id }),
      JSON.stringify({
        ...pendingRecord(),
        smartAccountAddress: ADMIN,
      }),
      JSON.stringify({ ...pendingRecord(), version: 2 }),
    ];

    invalidRecords.forEach((rawRecord) => {
      const storage = memoryStorage();
      storage.values.set(storageKey, rawRecord);

      expect(
        readPendingAaExitUserOp({
          chainId: arbitrum.id,
          smartAccountAddress,
          storage,
        }),
      ).toBeNull();
      expect(storage.removeItem).toHaveBeenCalledWith(storageKey);
      expect(storage.values.has(storageKey)).toBe(false);
    });
  });

  it("only clears a hash-qualified pending record when the hash matches", () => {
    const storage = memoryStorage();
    const record = pendingRecord();
    writePendingAaExitUserOp(record, { storage });

    clearPendingAaExitUserOp({
      chainId: arbitrum.id,
      smartAccountAddress,
      userOpHash: `0x${"d".repeat(64)}`,
      storage,
    });
    expect(storage.values.get(storageKey)).toBe(JSON.stringify(record));

    clearPendingAaExitUserOp({
      chainId: arbitrum.id,
      smartAccountAddress,
      userOpHash,
      storage,
    });
    expect(storage.values.has(storageKey)).toBe(false);
  });

  it("clears an unqualified pending record for the account", () => {
    const storage = memoryStorage();
    writePendingAaExitUserOp(pendingRecord(), { storage });

    clearPendingAaExitUserOp({
      chainId: arbitrum.id,
      smartAccountAddress,
      storage,
    });

    expect(storage.removeItem).toHaveBeenCalledWith(storageKey);
    expect(storage.values.has(storageKey)).toBe(false);
  });
});

describe("AA UserOp probing and isolation", () => {
  const probeGroup = (index, overrides = {}) => ({
    kind: "protocol",
    uniqueId: `p${index}`,
    label: `protocol ${index}`,
    level: 0,
    dependent: true,
    txns: [`txn-${index}`],
    buildError: null,
    rewardBalances: [],
    ...overrides,
  });

  const idsOf = (candidateGroups) =>
    candidateGroups
      .filter((group) => group.kind !== "rewards")
      .map((group) => group.uniqueId);

  it("keeps 19 healthy groups in one batch when one of 20 is bad", async () => {
    const groups = Array.from({ length: 20 }, (_, index) => probeGroup(index));
    const probe = vi.fn(async (candidateGroups) => {
      if (idsOf(candidateGroups).includes("p7"))
        throw new Error("paymaster 500");
    });
    const onProbe = vi.fn();

    const plan = await planAaExitBatches({
      groups,
      chainMetadata: arbitrum,
      recipient: RECIPIENT,
      probe,
      onProbe,
    });

    expect(plan.excluded.map(({ group }) => group.uniqueId)).toEqual(["p7"]);
    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].units).toHaveLength(19);
    expect(plan.batches[0].units.some((group) => group.uniqueId === "p7")).toBe(
      false,
    );
    expect(onProbe).toHaveBeenCalled();
    expect(onProbe.mock.calls[0][0]).toEqual({
      probeCount: 1,
      candidateCount: 20,
    });
  });

  it("never splits an approve -> unstake -> transfer protocol dependency", async () => {
    const dependency = probeGroup(1, {
      txns: ["approve", "unstake", "transfer"],
    });
    const observed = [];
    const probe = vi.fn(async (candidateGroups) => {
      const protocol = candidateGroups.find((group) => group.uniqueId === "p1");
      if (protocol) {
        observed.push(protocol.txns);
        throw new Error("reverted");
      }
    });

    const plan = await planAaExitBatches({
      groups: [probeGroup(0), dependency, probeGroup(2)],
      chainMetadata: arbitrum,
      recipient: RECIPIENT,
      probe,
    });

    expect(plan.excluded.map(({ group }) => group.uniqueId)).toContain("p1");
    expect(observed.length).toBeGreaterThan(0);
    observed.forEach((txns) =>
      expect(txns).toEqual(["approve", "unstake", "transfer"]),
    );
  });

  it("turns aggregate-only failure into a few large passing batches", async () => {
    const groups = Array.from({ length: 8 }, (_, index) => probeGroup(index));
    const probe = vi.fn(async (candidateGroups) => {
      if (idsOf(candidateGroups).length > 4)
        throw new Error("UserOp too large");
    });

    const plan = await planAaExitBatches({
      groups,
      chainMetadata: base,
      recipient: RECIPIENT,
      probe,
    });

    expect(plan.excluded).toEqual([]);
    expect(plan.aggregateLimited).toBe(true);
    expect(plan.batches).toHaveLength(2);
    expect(plan.batches.map((batch) => batch.units.length)).toEqual([4, 4]);
  });

  it("isolates two bad groups and recombines every survivor", async () => {
    const groups = Array.from({ length: 12 }, (_, index) => probeGroup(index));
    const bad = new Set(["p2", "p9"]);
    const probe = vi.fn(async (candidateGroups) => {
      if (idsOf(candidateGroups).some((id) => bad.has(id))) {
        throw new Error("bad group");
      }
    });

    const plan = await planAaExitBatches({
      groups,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      probe,
    });

    expect(plan.excluded.map(({ group }) => group.uniqueId).sort()).toEqual([
      "p2",
      "p9",
    ]);
    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].units).toHaveLength(10);
  });

  it("rebuilds claimed rewards from surviving protocol producers only", async () => {
    const badReward = ethers.BigNumber.from(100);
    const goodReward = ethers.BigNumber.from(7);
    const groups = [
      probeGroup(0, {
        rewardBalances: [{ address: USDC_ARB, balance: badReward }],
      }),
      probeGroup(1, {
        rewardBalances: [{ address: USDC_ARB, balance: goodReward }],
      }),
    ];
    const probe = vi.fn(async (candidateGroups) => {
      if (idsOf(candidateGroups).includes("p0"))
        throw new Error("bad producer");
    });

    const plan = await planAaExitBatches({
      groups,
      chainMetadata: arbitrum,
      recipient: RECIPIENT,
      probe,
    });
    const rewards = plan.batches[0].groups.find(
      (group) => group.uniqueId === "claimed-rewards",
    );

    expect(rewards).toBeDefined();
    expect(rewards.txns).toHaveLength(1);
    const data = await encode(rewards.txns[0]);
    expect(ethers.BigNumber.from(`0x${data.slice(-64)}`).toString()).toBe(
      goodReward.toString(),
    );
  });

  it("probes Arbitrum, Base and Optimism without broadcasting a UserOp", async () => {
    const adminAccount = { address: RECIPIENT };
    const smartAccountAddress = "0x9999999999999999999999999999999999999999";
    for (const chainMetadata of [arbitrum, base, optimism]) {
      const prepareUserOpFn = vi.fn(async (options) => ({
        sender: smartAccountAddress,
        chainId: options.smartWalletOptions.chain.id,
      }));
      await probeAaBatch({
        groups: [probeGroup(0)],
        adminAccount,
        chainMetadata,
        smartAccountAddress,
        prepareUserOpFn,
      });

      expect(prepareUserOpFn).toHaveBeenCalledTimes(1);
      const options = prepareUserOpFn.mock.calls[0][0];
      expect(options.smartWalletOptions).toMatchObject({
        chain: chainMetadata,
        sponsorGas: true,
      });
      expect(options.waitForDeployment).toBe(false);
    }
  });

  it("does not retry after user rejection or unknown submission state", async () => {
    const plan = {
      excluded: [],
      batches: [
        {
          units: [probeGroup(0)],
          groups: [probeGroup(0)],
        },
      ],
    };
    for (const error of [
      { code: 4001, message: "user rejected" },
      new Error("timeout waiting for userop hash"),
    ]) {
      const sendBatchTransaction = vi.fn((_calls, callbacks) =>
        callbacks.onError(error),
      );
      const result = await executeAaExitPlan({
        plan,
        sendBatchTransaction,
        updateGroup: vi.fn(),
      });
      expect(sendBatchTransaction).toHaveBeenCalledTimes(1);
      expect(["cancelled", "unknown"]).toContain(result.status);
    }
  });
});

let restoreWarn;
let restoreError;
beforeEach(() => {
  restoreWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  restoreError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  restoreWarn.mockRestore();
  restoreError.mockRestore();
});
