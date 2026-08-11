import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import { encode, prepareTransaction } from "thirdweb";
import { arbitrum, base, optimism } from "thirdweb/chains";
import {
  AA_EXIT_VAULTS,
  AaExitSubmissionError,
  EXIT_FEE_USD,
  PROTOCOL_TREASURY_ADDRESS,
  buildAaExecuteBatchTransaction,
  buildClaimedRewardsGroup,
  buildFeeGroup,
  buildWalletSweepGroups,
  clearPendingAaExitDirectTransaction,
  clearPendingAaExitUserOp,
  collectExitProtocols,
  createPendingAaExitDirectTransaction,
  aaExitPendingUserOpAction,
  clearAaExitWalletTokenCache,
  createPendingAaExitUserOp,
  debankChainCode,
  executeAaExitPlan,
  isPendingAaExitUserOpDead,
  materializeExitCandidate,
  nextExitLevel,
  parsePaymasterValidityWindow,
  planAaExitBatches,
  preflightWalletTokens,
  probeAaBatch,
  probeAaBatchDirect,
  readPendingAaExitDirectTransaction,
  readPendingAaExitUserOp,
  resolveAaCalls,
  runAaExitGroups,
  selectFeeToken,
  sendAaExitBatch,
  sendAaExitBatchDirect,
  sweptAddressesOf,
  triageAaExitUnits,
  usdToTokenRawFloor,
  writePendingAaExitDirectTransaction,
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

  // Two RPC round-trips per token is the second-slowest part of a scan, and the
  // assets in these deprecated vaults do not move between visits
  describe("cached across scans", () => {
    const balanceThen = (amount) => {
      const iface = new ethers.utils.Interface([
        "function balanceOf(address owner) view returns (uint256)",
      ]);
      return {
        call: vi
          .fn()
          .mockResolvedValueOnce(
            iface.encodeFunctionResult("balanceOf", [
              ethers.BigNumber.from(amount),
            ]),
          )
          .mockResolvedValueOnce("0x"),
      };
    };

    const preflight = ({ walletTokens, provider }) =>
      preflightWalletTokens({
        walletTokens,
        owner: OWNER,
        recipient: RECIPIENT,
        chainName: "arbitrum",
        provider,
        useCache: true,
      });

    beforeEach(() => {
      clearAaExitWalletTokenCache();
    });

    it("serves a second scan of the same tokens without any RPC call", async () => {
      const walletTokens = [
        token({ id: USDC_ARB, price: 1, amount: "1000000" }),
      ];
      await preflight({ walletTokens, provider: balanceThen(7) });

      const second = balanceThen(99);
      const result = await preflight({ walletTokens, provider: second });

      expect(second.call).not.toHaveBeenCalled();
      expect(result.walletTokens[0].raw_amount_hex_str).toBe("0x07");
    });

    // Reusing verdicts reached about a different set of tokens would sweep or
    // skip the wrong ones
    it("re-reads when the candidate token list changes", async () => {
      await preflight({
        walletTokens: [token({ id: USDC_ARB, price: 1, amount: "1000000" })],
        provider: balanceThen(7),
      });

      const second = balanceThen(5);
      await preflight({
        walletTokens: [token({ id: USDT_ARB, price: 1, amount: "5" })],
        provider: second,
      });

      expect(second.call).toHaveBeenCalledTimes(2);
    });

    it("keeps an untransferable verdict out of the sweep on a cache hit", async () => {
      const walletTokens = [
        token({ id: USDC_ARB, price: 0, amount: "1", symbol: "SPAM" }),
      ];
      const iface = new ethers.utils.Interface([
        "function balanceOf(address owner) view returns (uint256)",
      ]);
      await preflight({
        walletTokens,
        provider: {
          call: vi
            .fn()
            .mockResolvedValueOnce(
              iface.encodeFunctionResult("balanceOf", [
                ethers.BigNumber.from(1),
              ]),
            )
            .mockRejectedValueOnce(
              new Error("execution reverted: blacklisted"),
            ),
        },
      });

      const second = balanceThen(1);
      const result = await preflight({ walletTokens, provider: second });

      expect(second.call).not.toHaveBeenCalled();
      expect(result.walletTokens).toEqual([]);
      expect(result.untransferableTokens).toEqual([
        expect.objectContaining({ symbol: "SPAM" }),
      ]);
    });
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
  // What every guard inside sendAaExitBatchDirect throws before signing
  const notSubmitted = (message) =>
    new AaExitSubmissionError(new Error(message), {
      stage: "preparing",
      submitted: false,
    });

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

  // classifyEmergencyExitBatchError falls through to UNKNOWN for anything it does
  // not recognise, which used to bury the real cause under "check your wallet"
  it("reports a never-submitted failure with its own message, not as unknown", async () => {
    const harness = runner({
      groups: groupsOf({}, {}),
      send: failWith(
        notSubmitted(
          "Admin wallet 0xabc holds 0.0 ETH on Arbitrum but this transaction needs at least 0.0002 ETH",
        ),
      ),
    });
    const result = await harness.promise;

    expect(result.status).toBe("pre-submit-failed");
    expect(harness.statuses.p0.status).toBe("failed");
    expect(harness.statuses.p0.error).includes("needs at least 0.0002 ETH");
  });

  it("keeps a submitted-but-unconfirmed failure unknown", async () => {
    const harness = runner({
      groups: groupsOf({}, {}),
      send: failWith(
        new AaExitSubmissionError(new Error("receipt never arrived"), {
          stage: "submitted",
          submitted: true,
          transactionHash: `0x${"3".repeat(64)}`,
          submissionUnknown: true,
        }),
      ),
    });
    const result = await harness.promise;

    expect(result.status).toBe("unknown");
    expect(harness.statuses.p0.status).toBe("unknown");
  });

  describe("one item at a time", () => {
    const perGroup = (failing) => (calls, callbacks) =>
      failing.includes(calls[0])
        ? callbacks.onError(notSubmitted(`${calls[0]} cannot be handed over`))
        : callbacks.onSuccess({ transactionHash: `0x${calls[0]}` });

    // Nothing reached the network, so the untouched groups are still safe to send
    it("names the item that fails its own preflight and sends the rest", async () => {
      const harness = runner({
        groups: groupsOf({}, {}, {}, {}),
        combinedAllowed: false,
        continueOnPreSubmitFailure: true,
        send: perGroup(["txn-1"]),
      });
      const result = await harness.promise;

      expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(4);
      expect(harness.statuses.p1.status).toBe("failed");
      expect(harness.statuses.p1.error).includes("cannot be handed over");
      expect(
        ["p0", "p2", "p3"].map((id) => harness.statuses[id].status),
      ).toEqual(["success", "success", "success"]);
      expect(result.status).toBe("completed-with-groups");
    });

    // These may already be on chain; sending the next group could exit twice
    it.each([
      ["unknown", new Error("timeout waiting for userop hash")],
      ["cancelled", { code: 4001, message: "user rejected" }],
    ])("still stops the whole run on %s", async (status, error) => {
      const harness = runner({
        groups: groupsOf({}, {}, {}),
        combinedAllowed: false,
        continueOnPreSubmitFailure: true,
        send: (calls, callbacks) =>
          calls[0] === "txn-1"
            ? callbacks.onError(error)
            : callbacks.onSuccess({ transactionHash: `0x${calls[0]}` }),
      });
      const result = await harness.promise;

      expect(result.status).toBe(status);
      expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(2);
      expect(harness.statuses.p2).toBeUndefined();
    });

    it("stops on a never-submitted failure when continuing is not asked for", async () => {
      const harness = runner({
        groups: groupsOf({}, {}, {}),
        combinedAllowed: false,
        send: perGroup(["txn-1"]),
      });
      const result = await harness.promise;

      expect(result.status).toBe("pre-submit-failed");
      expect(harness.sendBatchTransaction).toHaveBeenCalledTimes(2);
    });
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

describe("direct AA executeBatch preparation", () => {
  const client = { clientId: "test-client" };

  it("resolves PreparedTransactions and builds the SDK-compatible executeBatch calldata", async () => {
    const transactions = [
      prepareTransaction({
        client,
        chain: arbitrum,
        to: RECIPIENT,
        value: 3n,
        data: "0x1234",
      }),
      prepareTransaction({
        client,
        chain: arbitrum,
        to: USDC_ARB,
        data: "0xabcd",
      }),
    ];
    const calls = await resolveAaCalls(transactions);

    expect(calls).toEqual([
      { to: RECIPIENT, value: 3n, data: "0x1234", chainId: arbitrum.id },
      { to: USDC_ARB, value: 0n, data: "0xabcd", chainId: arbitrum.id },
    ]);

    const batch = buildAaExecuteBatchTransaction({
      calls,
      smartAccountAddress: SMART_ACCOUNT,
      chainMetadata: arbitrum,
      client,
    });
    const data = await encode(batch);
    expect(data.slice(0, 10)).toBe("0x47e1da2a");
    const decoded = new ethers.utils.Interface([
      "function executeBatch(address[],uint256[],bytes[])",
    ]).decodeFunctionData("executeBatch", data);
    expect(decoded[0].map((address) => address.toLowerCase())).toEqual([
      RECIPIENT.toLowerCase(),
      USDC_ARB.toLowerCase(),
    ]);
    expect(decoded[1].map(String)).toEqual(["3", "0"]);
    expect(decoded[2]).toEqual(["0x1234", "0xabcd"]);
    expect(await batch.value).toBe(0n);
  });

  it("uses execute instead of executeBatch for a single direct call", async () => {
    const [call] = await resolveAaCalls([
      prepareTransaction({
        client,
        chain: arbitrum,
        to: RECIPIENT,
        value: 3n,
        data: "0x1234",
      }),
    ]);
    const transaction = buildAaExecuteBatchTransaction({
      calls: [call],
      smartAccountAddress: SMART_ACCOUNT,
      chainMetadata: arbitrum,
      client,
    });
    const data = await encode(transaction);
    expect(data.slice(0, 10)).toBe(
      new ethers.utils.Interface([
        "function execute(address,uint256,bytes)",
      ]).getSighash("execute"),
    );
  });

  it("probes the direct admin transaction without broadcasting", async () => {
    const estimateGasFn = vi.fn().mockResolvedValue(3_560_000n);
    const transaction = prepareTransaction({
      client,
      chain: arbitrum,
      to: RECIPIENT,
      data: "0x1234",
    });
    const result = await probeAaBatchDirect({
      groups: [{ txns: [transaction] }],
      adminAccount: { address: ADMIN },
      chainMetadata: arbitrum,
      smartAccountAddress: SMART_ACCOUNT,
      client,
      estimateGasFn,
    });

    expect(result.gas).toBe(3_560_000n);
    expect(estimateGasFn).toHaveBeenCalledWith({
      transaction: expect.any(Object),
      from: ADMIN,
    });
  });
});

describe("paymaster validity and pending UserOp safety gate", () => {
  const validUntil = 1_700_000_000;
  const validAfter = 1_699_999_000;
  const paymaster = "b2aa351111111111111111111111111111111111";
  const uint48 = (value) => value.toString(16).padStart(12, "0");

  it("parses the v0.6 VerifyingPaymaster packed validity window", () => {
    const packed = `0x${paymaster}${uint48(validUntil)}${uint48(
      validAfter,
    )}${"ab".repeat(65)}`;

    expect(parsePaymasterValidityWindow(packed)).toEqual({
      validUntil,
      validAfter,
    });
    for (const invalid of [
      null,
      "0x",
      "0x1234",
      "not-hex",
      `0x${"1".repeat(63)}`,
    ]) {
      expect(parsePaymasterValidityWindow(invalid)).toBeNull();
    }
  });

  it("returns no-pending, live, landed, dead and unknown conservatively", async () => {
    const nonce = (123n << 64n) | 7n;
    const pending = createPendingAaExitUserOp({
      chainId: arbitrum.id,
      smartAccountAddress: SMART_ACCOUNT,
      recipient: RECIPIENT,
      userOpHash: `0x${"9".repeat(64)}`,
      nonce,
      paymasterValidUntil: validUntil,
    });

    await expect(
      isPendingAaExitUserOpDead({
        pending: null,
        chainMetadata: arbitrum,
      }),
    ).resolves.toBe("no-pending");
    await expect(
      isPendingAaExitUserOpDead({
        pending,
        chainMetadata: arbitrum,
        nowSeconds: validUntil,
        readNonceFn: vi.fn(),
      }),
    ).resolves.toBe("live");
    await expect(
      isPendingAaExitUserOpDead({
        pending,
        chainMetadata: arbitrum,
        nowSeconds: validUntil + 100,
        readNonceFn: vi.fn().mockResolvedValue(nonce + 1n),
      }),
    ).resolves.toBe("landed");
    await expect(
      isPendingAaExitUserOpDead({
        pending,
        chainMetadata: arbitrum,
        nowSeconds: validUntil + 100,
        readNonceFn: vi.fn().mockResolvedValue(nonce),
      }),
    ).resolves.toBe("dead");
    await expect(
      isPendingAaExitUserOpDead({
        pending: createPendingAaExitUserOp({
          ...pending,
          nonce: undefined,
        }),
        chainMetadata: arbitrum,
        nowSeconds: validUntil + 100,
      }),
    ).resolves.toBe("unknown");
  });

  // Arbitrum used to skip this gate entirely because it could not create a
  // sponsored UserOp. Now that the gas payer is a per-chain toggle it can, so
  // every chain has to honour the same rule.
  describe("what a new submission may do about it", () => {
    it("only discards a record the chain proved never executed", () => {
      expect(aaExitPendingUserOpAction("dead")).toEqual({
        proceed: true,
        clear: true,
        recovered: "expired",
      });
    });

    it("keeps blocking without discarding anything else", () => {
      // "landed" especially: the record is the receipt poller's only handle on a
      // UserOp that did execute
      for (const liveness of ["live", "landed", "unknown"]) {
        expect(aaExitPendingUserOpAction(liveness)).toEqual({
          proceed: false,
          clear: false,
          recovered: null,
        });
      }
    });

    it("proceeds with nothing to clear when there is no record", () => {
      expect(aaExitPendingUserOpAction("no-pending")).toEqual({
        proceed: true,
        clear: false,
        recovered: null,
      });
    });
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
        { stage: "submitting", userOpHash, nonce: "0" },
        { stage: "submitted", userOpHash, nonce: "0" },
        { stage: "confirmed", userOpHash, transactionHash },
      ]);
    }
  });

  it("emits nonce and paymaster expiry before bundler submission", async () => {
    const validUntil = 1_786_271_915;
    const validAfter = 1_786_271_000;
    const pack48 = (value) => value.toString(16).padStart(12, "0");
    const paymasterAndData = `0x${"12".repeat(20)}${pack48(validUntil)}${pack48(
      validAfter,
    )}${"34".repeat(65)}`;
    const nonce = (77n << 64n) | 3n;
    const dependencies = senderDependencies({
      signUserOpFn: vi.fn().mockResolvedValue({
        ...signedUserOp,
        nonce,
        paymasterAndData,
      }),
    });
    const onStage = vi.fn();

    await sendWith({ dependencies, onStage }).promise;

    expect(onStage).toHaveBeenNthCalledWith(3, {
      stage: "submitting",
      userOpHash,
      nonce: nonce.toString(),
      paymasterValidUntil: validUntil,
    });
    expect(onStage).toHaveBeenNthCalledWith(4, {
      stage: "submitted",
      userOpHash,
      nonce: nonce.toString(),
      paymasterValidUntil: validUntil,
    });
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
      nonce: "0",
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

describe("direct admin AA Exit submission", () => {
  const adminAccount = { address: ADMIN };
  const client = { clientId: "test-client" };
  const transactionHash = `0x${"d".repeat(64)}`;
  const transactionFor = (chainMetadata = arbitrum) => ({
    chain: chainMetadata,
    to: RECIPIENT,
    data: "0x1234",
  });
  const callsFor = (chainMetadata = arbitrum) => [
    {
      to: RECIPIENT,
      value: 0n,
      data: "0x1234",
      chainId: chainMetadata.id,
    },
  ];
  const directDependencies = (overrides = {}) => ({
    resolveCallsFn: vi.fn().mockResolvedValue(callsFor()),
    getCodeFn: vi.fn().mockResolvedValue("0x6000"),
    isAdminFn: vi.fn().mockResolvedValue(true),
    simulateTransactionFn: vi.fn().mockResolvedValue(undefined),
    estimateGasFn: vi.fn().mockResolvedValue(3_560_000n),
    getAdminBalanceFn: vi.fn().mockResolvedValue(10n ** 18n),
    getGasPriceFn: vi.fn().mockResolvedValue(1n),
    sendTransactionFn: vi.fn().mockResolvedValue({ transactionHash }),
    waitForReceiptFn: vi.fn().mockResolvedValue({
      status: "success",
      transactionHash,
    }),
    ...overrides,
  });
  const sendDirectWith = ({
    chainMetadata = arbitrum,
    transactions = [transactionFor(chainMetadata)],
    dependencies = directDependencies({
      resolveCallsFn: vi.fn().mockResolvedValue(callsFor(chainMetadata)),
    }),
    onStage = vi.fn(),
  } = {}) => ({
    dependencies,
    onStage,
    promise: sendAaExitBatchDirect({
      transactions,
      adminAccount,
      chainMetadata,
      expectedSmartAccountAddress: SMART_ACCOUNT,
      client,
      onStage,
      ...dependencies,
    }),
  });

  it("preflights, asks for one normal signature, and confirms", async () => {
    const { promise, dependencies, onStage } = sendDirectWith();

    await expect(promise).resolves.toMatchObject({ transactionHash });
    expect(dependencies.isAdminFn).toHaveBeenCalledWith({
      contract: expect.objectContaining({ address: SMART_ACCOUNT }),
      signer: ADMIN,
    });
    expect(dependencies.simulateTransactionFn).toHaveBeenCalledWith({
      transaction: expect.any(Object),
      from: ADMIN,
    });
    expect(dependencies.sendTransactionFn).toHaveBeenCalledWith({
      transaction: expect.any(Object),
      account: adminAccount,
    });
    expect(onStage.mock.calls.map(([event]) => event)).toEqual([
      { stage: "preparing" },
      { stage: "signing" },
      { stage: "submitted", transactionHash },
      { stage: "confirmed", transactionHash },
    ]);
  });

  // "needs at least 260000000000000 wei" left users topping up the smart wallet,
  // which cannot pay for a direct transaction at all
  it("names the admin wallet and both ETH amounts when it cannot cover gas", async () => {
    const dependencies = directDependencies({
      estimateGasFn: vi.fn().mockResolvedValue(1_000_000n),
      getGasPriceFn: vi.fn().mockResolvedValue(10n ** 9n),
      getAdminBalanceFn: vi.fn().mockResolvedValue(10n ** 14n),
    });
    const error = await sendDirectWith({ dependencies }).promise.catch(
      (caught) => caught,
    );

    expect(error.submitted).toBe(false);
    expect(error.message).includes(ADMIN);
    expect(error.message).includes("holds 0.0001 ETH");
    expect(error.message).includes("needs at least 0.001 ETH");
    expect(error.message).includes("not the smart wallet");
    expect(dependencies.sendTransactionFn).not.toHaveBeenCalled();
  });

  it("points a batch over the gas limit at sending the items one at a time", async () => {
    const dependencies = directDependencies({
      estimateGasFn: vi.fn().mockResolvedValue(30_000_000n),
    });
    const error = await sendDirectWith({ dependencies }).promise.catch(
      (caught) => caught,
    );

    expect(error.submitted).toBe(false);
    expect(error.message).includes("one at a time");
    expect(dependencies.sendTransactionFn).not.toHaveBeenCalled();
  });

  it("refuses a non-admin before asking for a signature", async () => {
    const dependencies = directDependencies({
      isAdminFn: vi.fn().mockResolvedValue(false),
    });
    const error = await sendDirectWith({ dependencies }).promise.catch(
      (caught) => caught,
    );

    expect(error).toMatchObject({ stage: "preparing", submitted: false });
    expect(error.message).toContain("is not an admin");
    expect(dependencies.sendTransactionFn).not.toHaveBeenCalled();
  });

  it("refuses a wrong-chain transaction before any preflight call", async () => {
    const dependencies = directDependencies();
    await expect(
      sendDirectWith({
        dependencies,
        transactions: [transactionFor(base)],
      }).promise,
    ).rejects.toMatchObject({
      message: expect.stringContaining("cross-chain direct batch"),
      submitted: false,
    });
    expect(dependencies.getCodeFn).not.toHaveBeenCalled();
    expect(dependencies.sendTransactionFn).not.toHaveBeenCalled();
  });

  it("refuses an undeployed AA before asking for a signature", async () => {
    const dependencies = directDependencies({
      getCodeFn: vi.fn().mockResolvedValue("0x"),
    });
    await expect(
      sendDirectWith({ dependencies }).promise,
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        "requires the smart account to be deployed",
      ),
      stage: "preparing",
    });
    expect(dependencies.isAdminFn).not.toHaveBeenCalled();
    expect(dependencies.sendTransactionFn).not.toHaveBeenCalled();
  });

  it("stops on a dry-run revert without opening the wallet", async () => {
    const dependencies = directDependencies({
      simulateTransactionFn: vi
        .fn()
        .mockRejectedValue(new Error("simulation reverted")),
    });
    await expect(
      sendDirectWith({ dependencies }).promise,
    ).rejects.toMatchObject({
      message: "simulation reverted",
      stage: "preparing",
      submitted: false,
    });
    expect(dependencies.estimateGasFn).not.toHaveBeenCalled();
    expect(dependencies.sendTransactionFn).not.toHaveBeenCalled();
  });

  it("classifies a Rabby rejection as cancelled by the execution layer", async () => {
    const dependencies = directDependencies({
      sendTransactionFn: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("user rejected"), { code: 4001 }),
        ),
    });
    const plan = {
      excluded: [],
      batches: [
        {
          units: [{ uniqueId: "direct", txns: [transactionFor()] }],
          groups: [{ uniqueId: "direct", txns: [transactionFor()] }],
        },
      ],
    };
    const sendBatchTransaction = (transactions, callbacks) =>
      sendAaExitBatchDirect({
        transactions,
        adminAccount,
        chainMetadata: arbitrum,
        expectedSmartAccountAddress: SMART_ACCOUNT,
        client,
        ...dependencies,
      }).then(callbacks.onSuccess, callbacks.onError);
    const result = await executeAaExitPlan({
      plan,
      sendBatchTransaction,
      updateGroup: vi.fn(),
    });

    expect(result.status).toBe("cancelled");
  });

  it("reports a reverted receipt explicitly with its transaction hash", async () => {
    const dependencies = directDependencies({
      waitForReceiptFn: vi.fn().mockResolvedValue({ status: "reverted" }),
    });
    const { promise, onStage } = sendDirectWith({ dependencies });

    await expect(promise).rejects.toMatchObject({
      message: expect.stringContaining("reverted atomically"),
      stage: "submitted",
      submitted: true,
      transactionHash,
      submissionUnknown: false,
    });
    expect(onStage).toHaveBeenLastCalledWith({
      stage: "reverted",
      transactionHash,
    });
  });

  it("keeps a receipt timeout unknown and never invents a retry", async () => {
    const dependencies = directDependencies({
      waitForReceiptFn: vi
        .fn()
        .mockRejectedValue(new Error("timeout waiting for receipt")),
    });
    await expect(
      sendDirectWith({ dependencies }).promise,
    ).rejects.toMatchObject({
      stage: "submitted",
      submitted: true,
      transactionHash,
      submissionUnknown: true,
    });
    expect(dependencies.sendTransactionFn).toHaveBeenCalledTimes(1);
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
      nonce: (9n << 64n) | 2n,
      paymasterValidUntil: 1_786_271_915,
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
      nonce: ((9n << 64n) | 2n).toString(),
      paymasterValidUntil: 1_786_271_915,
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

describe("pending direct AA Exit transaction storage", () => {
  const transactionHash = `0x${"e".repeat(64)}`;
  const storageKey = `aa-exit-pending-direct-tx:v1:${
    arbitrum.id
  }:${SMART_ACCOUNT.toLowerCase()}`;
  const memoryStorage = () => {
    const values = new Map();
    return {
      values,
      getItem: vi.fn((key) => values.get(key) ?? null),
      setItem: vi.fn((key, value) => values.set(key, value)),
      removeItem: vi.fn((key) => values.delete(key)),
    };
  };

  it("round-trips and hash-qualifies a pending direct transaction", () => {
    const storage = memoryStorage();
    const record = createPendingAaExitDirectTransaction({
      chainId: arbitrum.id,
      smartAccountAddress: SMART_ACCOUNT,
      recipient: RECIPIENT,
      transactionHash,
      groupIds: ["protocol-a"],
      batchIndex: 0,
      batchCount: 2,
      createdAt: 1_700_000_000_000,
    });

    writePendingAaExitDirectTransaction(record, { storage });
    expect(storage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(record),
    );
    expect(
      readPendingAaExitDirectTransaction({
        chainId: arbitrum.id,
        smartAccountAddress: SMART_ACCOUNT,
        storage,
      }),
    ).toEqual(record);

    expect(
      clearPendingAaExitDirectTransaction({
        chainId: arbitrum.id,
        smartAccountAddress: SMART_ACCOUNT,
        transactionHash: `0x${"f".repeat(64)}`,
        storage,
      }),
    ).toBe(false);
    expect(storage.values.has(storageKey)).toBe(true);
    expect(
      clearPendingAaExitDirectTransaction({
        chainId: arbitrum.id,
        smartAccountAddress: SMART_ACCOUNT,
        transactionHash,
        storage,
      }),
    ).toBe(true);
    expect(storage.values.has(storageKey)).toBe(false);
  });
});

describe("AA UserOp probing, planning and triage", () => {
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

  it("puts every healthy group in one batch after a single probe", async () => {
    const groups = Array.from({ length: 20 }, (_, index) => probeGroup(index));
    const probe = vi.fn(async () => {});
    const onProbe = vi.fn();

    const plan = await planAaExitBatches({
      groups,
      chainMetadata: arbitrum,
      recipient: RECIPIENT,
      probe,
      onProbe,
    });

    expect(probe).toHaveBeenCalledTimes(1);
    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].units).toHaveLength(20);
    expect(plan.needsSelection).toBeUndefined();
    expect(onProbe.mock.calls[0][0]).toEqual({
      probeCount: 1,
      candidateCount: 20,
    });
  });

  // Splitting produced batches that each passed a probe taken from the same
  // starting state and then reverted on chain, because the first batch moved a
  // balance the later ones still asked for.
  it("hands a failing batch back for manual selection instead of splitting it", async () => {
    const groups = Array.from({ length: 20 }, (_, index) => probeGroup(index));
    const probe = vi.fn(async (candidateGroups) => {
      if (idsOf(candidateGroups).includes("p7"))
        throw new Error("ERC20: transfer amount exceeds balance");
    });

    const plan = await planAaExitBatches({
      groups,
      chainMetadata: arbitrum,
      recipient: RECIPIENT,
      probe,
    });

    expect(probe).toHaveBeenCalledTimes(1);
    expect(plan.batches).toEqual([]);
    expect(plan.needsSelection).toBe(true);
    expect(plan.fullBatchError).toBe("ERC20: transfer amount exceeds balance");
  });

  it("dry-runs only the selected units", async () => {
    const groups = Array.from({ length: 5 }, (_, index) => probeGroup(index));
    const probe = vi.fn(async () => {});

    const plan = await planAaExitBatches({
      groups,
      chainMetadata: base,
      recipient: RECIPIENT,
      probe,
      selectedUnitIds: new Set(["p1", "p3"]),
    });

    expect(idsOf(probe.mock.calls[0][0])).toEqual(["p1", "p3"]);
    expect(plan.batches[0].units.map((unit) => unit.uniqueId)).toEqual([
      "p1",
      "p3",
    ]);
  });

  it("never splits an approve -> unstake -> transfer protocol dependency", async () => {
    const dependency = probeGroup(1, {
      txns: ["approve", "unstake", "transfer"],
    });
    const observed = [];
    const probe = vi.fn(async (candidateGroups) => {
      const protocol = candidateGroups.find((group) => group.uniqueId === "p1");
      if (protocol) observed.push(protocol.txns);
    });

    await planAaExitBatches({
      groups: [probeGroup(0), dependency, probeGroup(2)],
      chainMetadata: arbitrum,
      recipient: RECIPIENT,
      probe,
    });

    expect(observed.length).toBeGreaterThan(0);
    observed.forEach((txns) =>
      expect(txns).toEqual(["approve", "unstake", "transfer"]),
    );
  });

  it("tells an item that fails alone apart from items that only clash together", async () => {
    const groups = Array.from({ length: 4 }, (_, index) => probeGroup(index));
    const probe = vi.fn(async (candidateGroups) => {
      if (idsOf(candidateGroups).includes("p2")) throw new Error("gauge dead");
    });
    const diagnose = vi.fn(async () => ({
      kind: "execution",
      message: "Transaction simulation failed: gauge dead",
    }));

    const triage = await triageAaExitUnits({
      groups,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      probe,
      diagnose,
    });

    expect(probe).toHaveBeenCalledTimes(4);
    expect(triage.filter((item) => !item.aloneOk)).toEqual([
      {
        uniqueId: "p2",
        label: "protocol 2",
        aloneOk: false,
        message: "Transaction simulation failed: gauge dead",
      },
    ]);
    expect(triage.filter((item) => item.aloneOk)).toHaveLength(3);
  });

  it("rebuilds claimed rewards from the producers in the batch only", async () => {
    const excludedReward = ethers.BigNumber.from(100);
    const includedReward = ethers.BigNumber.from(7);
    const groups = [
      probeGroup(0, {
        rewardBalances: [{ address: USDC_ARB, balance: excludedReward }],
      }),
      probeGroup(1, {
        rewardBalances: [{ address: USDC_ARB, balance: includedReward }],
      }),
    ];
    const probe = vi.fn(async () => {});

    const plan = await planAaExitBatches({
      groups,
      chainMetadata: arbitrum,
      recipient: RECIPIENT,
      probe,
      selectedUnitIds: new Set(["p1"]),
    });
    const rewards = plan.batches[0].groups.find(
      (group) => group.uniqueId === "claimed-rewards",
    );

    expect(rewards).toBeDefined();
    expect(rewards.txns).toHaveLength(1);
    const data = await encode(rewards.txns[0]);
    expect(ethers.BigNumber.from(`0x${data.slice(-64)}`).toString()).toBe(
      includedReward.toString(),
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

  it("submits a planned batch one transaction at a time when split mode is enabled", async () => {
    const first = prepareTransaction({
      client: { clientId: "test-client" },
      chain: arbitrum,
      to: RECIPIENT,
      data: "0x1111",
    });
    const second = prepareTransaction({
      client: { clientId: "test-client" },
      chain: arbitrum,
      to: USDC_ARB,
      data: "0x2222",
    });
    const plan = {
      excluded: [],
      batches: [
        {
          units: [{ uniqueId: "p0", txns: [first, second] }],
          groups: [{ uniqueId: "p0", txns: [first, second] }],
        },
      ],
    };
    const sendBatchTransaction = vi.fn((_calls, callbacks) =>
      callbacks.onSuccess({ transactionHash: `0x${"8".repeat(64)}` }),
    );

    const result = await executeAaExitPlan({
      plan,
      sendBatchTransaction,
      updateGroup: vi.fn(),
      splitTransactions: true,
    });

    expect(result.status).toBe("success");
    expect(sendBatchTransaction).toHaveBeenCalledTimes(2);
    expect(sendBatchTransaction.mock.calls[0][0]).toEqual([first]);
    expect(sendBatchTransaction.mock.calls[1][0]).toEqual([second]);
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

  it("passes a known direct transaction hash through failed group updates", async () => {
    const transactionHash = `0x${"7".repeat(64)}`;
    const error = new AaExitSubmissionError(
      new Error("direct transaction reverted atomically"),
      {
        stage: "submitted",
        submitted: true,
        transactionHash,
      },
    );
    const plan = {
      excluded: [],
      batches: [
        {
          units: [probeGroup(0)],
          groups: [probeGroup(0)],
        },
      ],
    };
    const updateGroup = vi.fn();
    const result = await executeAaExitPlan({
      plan,
      sendBatchTransaction: vi.fn((_calls, callbacks) =>
        callbacks.onError(error),
      ),
      updateGroup,
    });

    expect(result).toMatchObject({
      status: "pre-submit-failed",
      transactionHash,
    });
    expect(updateGroup).toHaveBeenLastCalledWith(
      "p0",
      expect.objectContaining({ status: "failed", transactionHash }),
    );
  });

  // The classifier's catch-all is UNKNOWN, so a guard message it does not
  // recognise used to reach the row as "status is unknown, check your wallet" for
  // something that never left the browser
  it("surfaces a never-submitted guard failure instead of calling it unknown", async () => {
    const plan = { batches: [{ units: [probeGroup(0)], groups: [] }] };
    const updateGroup = vi.fn();
    const result = await executeAaExitPlan({
      plan,
      sendBatchTransaction: vi.fn((_calls, callbacks) =>
        callbacks.onError(
          new AaExitSubmissionError(
            new Error(
              "Admin wallet 0xabc holds 0.0 ETH on Arbitrum but this transaction needs at least 0.0002 ETH. Top up that address.",
            ),
            { stage: "preparing", submitted: false },
          ),
        ),
      ),
      updateGroup,
    });

    expect(result.status).toBe("pre-submit-failed");
    expect(updateGroup).toHaveBeenLastCalledWith(
      "p0",
      expect.objectContaining({
        status: "failed",
        error: expect.stringContaining("Top up that address"),
      }),
    );
  });

  it("keeps a lost bundler response unknown", async () => {
    const userOpHash = `0x${"5".repeat(64)}`;
    const plan = { batches: [{ units: [probeGroup(0)], groups: [] }] };
    const updateGroup = vi.fn();
    const result = await executeAaExitPlan({
      plan,
      sendBatchTransaction: vi.fn((_calls, callbacks) =>
        callbacks.onError(
          new AaExitSubmissionError(new Error("socket hang up"), {
            stage: "submitting",
            submitted: true,
            userOpHash,
            submissionUnknown: true,
          }),
        ),
      ),
      updateGroup,
    });

    expect(result.status).toBe("submitted");
    expect(updateGroup).toHaveBeenLastCalledWith(
      "p0",
      expect.objectContaining({ status: "submitted", userOpHash }),
    );
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
