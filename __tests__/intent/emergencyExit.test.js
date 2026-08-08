import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import { encode } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";
import { fetchWalletTokens } from "../../utils/dustConversion";

vi.mock("../../utils/dustConversion", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchWalletTokens: vi.fn(),
}));

const OWNER = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
const RECIPIENT = "0x1234567890123456789012345678901234567890";
// transfer(address,uint256)
const TRANSFER_SELECTOR = "a9059cbb";
// Gauge.withdraw(uint256)
const WITHDRAW_SELECTOR = "2e1a7d4d";
// Gauge.getReward(address)
const GET_REWARD_SELECTOR = "c00007b0";
// safeTransferFrom(address,address,uint256)
const SAFE_TRANSFER_FROM_SELECTOR = "42842e0e";
const VELO = "0x9560e827af36c94d2ac33a39bce1fe78631088db";
const noop = () => {};

const protocolsOn = (portfolioHelper, chain) =>
  Object.values(portfolioHelper.strategy).flatMap(
    (category) => category[chain] || [],
  );

const word = (value) =>
  ethers.utils
    .hexZeroPad(ethers.BigNumber.from(value).toHexString(), 32)
    .slice(2);

// Pins both balance reads so the txn shape is deterministic and independent of
// whatever the live OP position happens to hold
const stubBalances = (protocol, { staked, wallet }) => {
  vi.spyOn(protocol, "stakeBalanceOf").mockResolvedValue(
    ethers.BigNumber.from(staked),
  );
  vi.spyOn(protocol, "assetBalanceOf").mockResolvedValue(
    ethers.BigNumber.from(wallet),
  );
};

// The claim leg reaches into protocol-specific code (RPC, third-party APIs);
// tests that only assert on the principal pin it to "nothing to claim" so the
// principal txns keep their index
const stubNoRewards = (protocol) =>
  vi.spyOn(protocol, "customClaim").mockResolvedValue([[], {}]);

// Pins the reward read one level below customClaim, so the claim txn itself is
// still built by the real protocol code
const stubPendingRewards = (protocol, rewardsDict) =>
  vi.spyOn(protocol, "pendingRewards").mockResolvedValue(rewardsDict);

let getBalance;

beforeEach(() => {
  // Both the wallet scan and the native balance read are best-effort inputs.
  // Neutral defaults keep the synthetic groups out of the way unless a test
  // opts into them.
  fetchWalletTokens.mockResolvedValue([]);
  getBalance = vi
    .spyOn(ethers.providers.BaseProvider.prototype, "getBalance")
    .mockResolvedValue(ethers.constants.Zero);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("emergencyTransfer", () => {
  it("unstakes and transfers the full staked balance", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000000000000000000", wallet: "0" });
    stubNoRewards(protocol);

    const { txns } = await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

    expect(txns).toHaveLength(2);
    expect(await encode(txns[0])).includes(WITHDRAW_SELECTOR);
    const transferData = await encode(txns[1]);
    expect(transferData).includes(TRANSFER_SELECTOR);
    expect(transferData.toLowerCase()).includes(
      RECIPIENT.slice(2).toLowerCase(),
    );
    expect(transferData).includes(word("1000000000000000000"));
  });

  it("sweeps LP already sitting in the wallet on top of the staked balance", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "700", wallet: "300" });
    stubNoRewards(protocol);

    const { txns } = await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

    expect(txns).toHaveLength(2);
    expect(await encode(txns[1])).includes(word("1000"));
  });

  // Camelot reports vesting xGRAIL as a pending reward, but only
  // customRedeemVestingRewards can release it and xGRAIL cannot be transferred
  // anyway. Promising it to a transfer would revert the batch it rides in.
  it("leaves rewards that are still vesting out of the sweep", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000", wallet: "0" });
    stubPendingRewards(protocol, {
      [ethers.utils.getAddress(VELO)]: {
        symbol: "velo",
        balance: ethers.BigNumber.from("700"),
        decimals: 18,
        vesting: true,
        chain: "op",
      },
    });

    const { rewardBalances } = await protocol.emergencyTransfer(
      OWNER,
      RECIPIENT,
      noop,
    );

    expect(rewardBalances).toHaveLength(0);
  });

  // A claim that emits no transaction delivers nothing, so whatever balance it
  // reported is still locked in the protocol
  it("promises no reward transfer when the claim emits no transaction", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000", wallet: "0" });
    vi.spyOn(protocol, "customClaim").mockResolvedValue([
      [],
      {
        [ethers.utils.getAddress(VELO)]: {
          symbol: "velo",
          balance: ethers.BigNumber.from("700"),
          decimals: 18,
        },
      },
    ]);

    const { rewardBalances } = await protocol.emergencyTransfer(
      OWNER,
      RECIPIENT,
      noop,
    );

    expect(rewardBalances).toHaveLength(0);
  });

  // Several protocols in one vault share a position manager, so an unscoped
  // enumeration would make each of their groups try to move all of the wallet's
  // NFTs and only the first could succeed
  it("only lists NFT positions belonging to its own pool", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Camelot Vault"),
      "arbitrum",
    ).map((p) => p.interface);
    const { tickLower, tickUpper } = protocol.customParams.tickers;
    const [token0, token1] = protocol.customParams.lpTokens;
    const mine = {
      tickLower,
      tickUpper,
      token0: token0[1],
      token1: token1[1],
    };
    protocol.assetContractInstance = {
      balanceOf: vi.fn().mockResolvedValue(ethers.BigNumber.from(3)),
      tokenOfOwnerByIndex: vi
        .fn()
        .mockImplementation((_owner, idx) =>
          Promise.resolve(ethers.BigNumber.from(100 + idx)),
        ),
      positions: vi.fn().mockImplementation((tokenId) =>
        Promise.resolve(
          Number(tokenId) === 101
            ? {
                tickLower: tickLower + 10,
                tickUpper: tickUpper + 10,
                token0: "0x000000000000000000000000000000000000dEaD",
                token1: "0x000000000000000000000000000000000000bEEF",
              }
            : mine,
        ),
      ),
    };

    const tokenIds = await protocol._getAllNftIDs(OWNER);

    expect(tokenIds.map(Number)).toEqual([100, 102]);
  });

  // Aave, Moonwell and PendlePT have no separate staking contract: _unstake
  // emits no txn and sizes its amount off assetBalanceOf, so that amount already
  // IS the wallet balance. Adding the wallet balance on top asks for twice what
  // the user holds and reverts, which made the escape hatch useless for every
  // one of those positions. The LP cases above cannot catch this because their
  // staked balance is a genuinely separate number.
  it("does not double-count the balance when there is no staking contract", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Moonwell Stablecoin Vault"),
      "base",
    ).map((p) => p.interface);
    vi.spyOn(protocol, "assetBalanceOf").mockResolvedValue(
      ethers.BigNumber.from("1000"),
    );
    stubNoRewards(protocol);

    const { txns } = await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

    expect(txns).toHaveLength(1);
    const transferData = await encode(txns[0]);
    expect(transferData).includes(TRANSFER_SELECTOR);
    expect(transferData).includes(word("1000"));
    expect(transferData).not.includes(word("2000"));
  });

  it("skips the unstake txn when nothing is staked", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "0", wallet: "500" });
    stubNoRewards(protocol);

    const { txns } = await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

    // withdraw(0) reverts on some gauges, so it must not be emitted
    expect(txns).toHaveLength(1);
    const data = await encode(txns[0]);
    expect(data).includes(TRANSFER_SELECTOR);
    expect(data).includes(word("500"));
  });

  it("returns no txns when the position is empty", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "0", wallet: "0" });
    stubNoRewards(protocol);

    const { txns, rewardBalances } = await protocol.emergencyTransfer(
      OWNER,
      RECIPIENT,
      noop,
    );

    expect(txns).toEqual([]);
    expect(rewardBalances).toEqual([]);
  });

  // Velodrome's claim builds getReward() regardless of the staked balance, so an
  // empty position used to hand back a claim-only group: a row in the panel and
  // a signature for a protocol the user never entered
  it("skips the reward claim entirely when there is no position", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "0", wallet: "0" });
    const customClaim = vi.spyOn(protocol, "customClaim");

    const { txns, rewardBalances } = await protocol.emergencyTransfer(
      OWNER,
      RECIPIENT,
      noop,
    );

    expect(txns).toEqual([]);
    expect(rewardBalances).toEqual([]);
    expect(customClaim).not.toHaveBeenCalled();
  });

  it("never reads token prices", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000", wallet: "0" });
    stubNoRewards(protocol);
    const usdBalanceOf = vi.spyOn(protocol, "usdBalanceOf");
    const assetUsdPrice = vi.spyOn(protocol, "assetUsdPrice");

    await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

    expect(usdBalanceOf).not.toHaveBeenCalled();
    expect(assetUsdPrice).not.toHaveBeenCalled();
  });

  it("claims first so the rewards are in the wallet before the principal moves", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000", wallet: "0" });
    stubPendingRewards(protocol, {
      // checksummed on purpose: the caller de-duplicates on the address, so
      // emergencyTransfer has to hand it back lowercased
      [ethers.utils.getAddress(VELO)]: {
        symbol: "velo",
        balance: ethers.BigNumber.from("700"),
        decimals: 18,
        chain: "op",
      },
    });

    const { txns, rewardBalances } = await protocol.emergencyTransfer(
      OWNER,
      RECIPIENT,
      noop,
    );

    expect(txns).toHaveLength(3);
    expect(await encode(txns[0])).includes(GET_REWARD_SELECTOR);
    expect(await encode(txns[1])).includes(WITHDRAW_SELECTOR);
    expect(await encode(txns[2])).includes(TRANSFER_SELECTOR);
    expect(rewardBalances).toHaveLength(1);
    expect(rewardBalances[0].address).toBe(VELO);
    expect(rewardBalances[0].balance.toString()).toBe("700");
  });

  // A retry needs a way to shed the claim leg, which is the only part that can
  // fail on its own. Rewards left unclaimed are postponed, not lost.
  it("leaves the claim out entirely when asked to skip rewards", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000", wallet: "0" });
    const customClaim = vi.spyOn(protocol, "customClaim");

    const { txns, rewardBalances } = await protocol.emergencyTransfer(
      OWNER,
      RECIPIENT,
      noop,
      { skipRewards: true },
    );

    expect(customClaim).not.toHaveBeenCalled();
    expect(txns).toHaveLength(2);
    expect(await encode(txns[0])).includes(WITHDRAW_SELECTOR);
    expect(await encode(txns[1])).includes(TRANSFER_SELECTOR);
    expect(rewardBalances).toEqual([]);
  });

  it("still moves the principal when the reward claim blows up", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000", wallet: "0" });
    vi.spyOn(protocol, "customClaim").mockRejectedValue(
      new Error("reward api down"),
    );

    const { txns, rewardBalances } = await protocol.emergencyTransfer(
      OWNER,
      RECIPIENT,
      noop,
    );

    // forfeiting rewards is survivable, being unable to withdraw principal is not
    expect(txns).toHaveLength(2);
    expect(await encode(txns[0])).includes(WITHDRAW_SELECTOR);
    expect(await encode(txns[1])).includes(TRANSFER_SELECTOR);
    expect(rewardBalances).toEqual([]);
  });

  it("moves every NFT position whole instead of reading a liquidity balance", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Camelot Vault"),
      "arbitrum",
    ).map((p) => p.interface);
    expect(protocol.assetIsNFT).toBe(true);
    stubNoRewards(protocol);
    vi.spyOn(protocol, "_getAllNftIDs").mockResolvedValue([
      ethers.BigNumber.from("101"),
      ethers.BigNumber.from("202"),
    ]);
    const assetBalanceOf = vi.spyOn(protocol, "assetBalanceOf");

    const { txns } = await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

    expect(txns).toHaveLength(2);
    const encoded = await Promise.all(txns.map((txn) => encode(txn)));
    encoded.forEach((data) => {
      expect(data).includes(SAFE_TRANSFER_FROM_SELECTOR);
      // an ERC20 transfer here would move the position manager's own balance
      expect(data).not.toContain(TRANSFER_SELECTOR);
    });
    expect(encoded[0]).includes(word("101"));
    expect(encoded[1]).includes(word("202"));
    // assetBalanceOf reports pooled liquidity for an NFT, not a token count
    expect(assetBalanceOf).not.toHaveBeenCalled();
  });

  it("tolerates a wallet balance read that comes back undefined", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000", wallet: "0" });
    stubNoRewards(protocol);
    // some assetBalanceOf implementations resolve to undefined once the
    // underlying position is gone
    vi.spyOn(protocol, "assetBalanceOf").mockResolvedValue(undefined);

    const { txns } = await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

    expect(txns).toHaveLength(2);
    expect(await encode(txns[1])).includes(word("1000"));
  });
});

describe("getEmergencyExitTxnsByProtocol", () => {
  it("isolates a failing protocol so the rest still produce txns", async () => {
    const portfolioHelper = getPortfolioHelper("Stable+ Vault");
    const protocols = protocolsOn(portfolioHelper, "op").map(
      (p) => p.interface,
    );
    expect(protocols.length).toBeGreaterThan(1);

    protocols.forEach((protocol, i) => {
      stubBalances(protocol, { staked: "1000", wallet: "0" });
      stubNoRewards(protocol);
      if (i === 0) {
        vi.spyOn(protocol, "stakeBalanceOf").mockRejectedValue(
          new Error("boom"),
        );
      }
    });

    const groups = await portfolioHelper.getEmergencyExitTxnsByProtocol({
      account: OWNER,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      updateProgress: noop,
    });

    expect(groups).toHaveLength(protocols.length);
    expect(groups[0].buildError).toContain("boom");
    expect(groups[0].txns).toEqual([]);
    groups.slice(1).forEach((group) => {
      expect(group.buildError).toBeNull();
      expect(group.txns).toHaveLength(2);
    });
  });

  it("omits the group for a protocol that holds nothing", async () => {
    const portfolioHelper = getPortfolioHelper("Stable+ Vault");
    const protocols = protocolsOn(portfolioHelper, "op").map(
      (p) => p.interface,
    );
    expect(protocols.length).toBeGreaterThan(1);

    protocols.forEach((protocol, i) => {
      if (i === 0) {
        stubBalances(protocol, { staked: "0", wallet: "0" });
        // the real claim would still build a getReward txn from this
        stubPendingRewards(protocol, {
          [ethers.utils.getAddress(VELO)]: {
            symbol: "velo",
            balance: ethers.BigNumber.from("700"),
            decimals: 18,
            chain: "op",
          },
        });
      } else {
        stubBalances(protocol, { staked: "1000", wallet: "0" });
        stubNoRewards(protocol);
      }
    });

    const groups = await portfolioHelper.getEmergencyExitTxnsByProtocol({
      account: OWNER,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      updateProgress: noop,
    });

    expect(groups).toHaveLength(protocols.length - 1);
    expect(
      groups.every((group) => group.uniqueId !== protocols[0].uniqueId()),
    ).toBe(true);
  });

  it("never fetches the token price mapping table", async () => {
    const portfolioHelper = getPortfolioHelper("Velodrome Vault");
    protocolsOn(portfolioHelper, "op").forEach((p) => {
      stubBalances(p.interface, { staked: "1000", wallet: "0" });
      stubNoRewards(p.interface);
    });
    const getTokenPrices = vi.spyOn(
      portfolioHelper,
      "getTokenPricesMappingTable",
    );

    await portfolioHelper.getEmergencyExitTxnsByProtocol({
      account: OWNER,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      updateProgress: noop,
    });

    expect(getTokenPrices).not.toHaveBeenCalled();
  });

  it("only targets the requested protocol when uniqueIds is given", async () => {
    const portfolioHelper = getPortfolioHelper("Stable+ Vault");
    const protocols = protocolsOn(portfolioHelper, "op").map(
      (p) => p.interface,
    );
    protocols.forEach((protocol) => {
      stubBalances(protocol, { staked: "1000", wallet: "0" });
      stubNoRewards(protocol);
    });
    const target = protocols[1].uniqueId();

    const groups = await portfolioHelper.getEmergencyExitTxnsByProtocol({
      account: OWNER,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      updateProgress: noop,
      uniqueIds: [target],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].uniqueId).toBe(target);
  });

  it("reports a failed wallet scan instead of quietly dropping the row", async () => {
    const portfolioHelper = getPortfolioHelper("Velodrome Vault");
    const protocols = protocolsOn(portfolioHelper, "op").map(
      (p) => p.interface,
    );
    protocols.forEach((protocol) => {
      stubBalances(protocol, { staked: "1000", wallet: "0" });
      stubNoRewards(protocol);
    });
    fetchWalletTokens.mockRejectedValue(new Error("backend down"));

    const groups = await portfolioHelper.getEmergencyExitTxnsByProtocol({
      account: OWNER,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      updateProgress: noop,
    });

    // the positions still exit
    protocols.forEach((protocol) => {
      const group = groups.find((g) => g.uniqueId === protocol.uniqueId());
      expect(group.buildError).toBeNull();
      expect(group.txns).toHaveLength(2);
    });
    // and the user is told the loose tokens were never read, rather than the
    // panel showing all-green while funds stayed behind
    const walletGroup = groups.find((g) => g.uniqueId === "wallet-tokens");
    expect(walletGroup.txns).toHaveLength(0);
    expect(walletGroup.buildError).toContain("backend down");
  });

  it("keeps predicted reward amounts out of the confirmed wallet sweep", async () => {
    const portfolioHelper = getPortfolioHelper("Velodrome Vault");
    const [protocol] = protocolsOn(portfolioHelper, "op").map(
      (p) => p.interface,
    );
    stubBalances(protocol, { staked: "1000", wallet: "0" });
    stubPendingRewards(protocol, {
      [ethers.utils.getAddress(VELO)]: {
        symbol: "velo",
        balance: ethers.BigNumber.from("700"),
        decimals: 18,
        chain: "op",
      },
    });
    fetchWalletTokens.mockResolvedValue([
      { id: VELO, raw_amount_hex_str: "0x12c" },
    ]);

    const groups = await portfolioHelper.getEmergencyExitTxnsByProtocol({
      account: OWNER,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      updateProgress: noop,
    });

    expect(fetchWalletTokens).toHaveBeenCalledWith("op", OWNER);
    // Split on purpose: 300 is what the wallet demonstrably holds, 700 is what a
    // protocol predicts its claim will pay. Summing them would let a bad
    // prediction revert the transfer of tokens the user definitely owns.
    const walletGroup = groups.find((g) => g.uniqueId === "wallet-tokens");
    expect(walletGroup.txns).toHaveLength(1);
    const walletData = await encode(walletGroup.txns[0]);
    expect(walletData).includes(TRANSFER_SELECTOR);
    expect(walletData).includes(word("300"));

    const rewardGroup = groups.find((g) => g.uniqueId === "claimed-rewards");
    expect(rewardGroup.txns).toHaveLength(1);
    const rewardData = await encode(rewardGroup.txns[0]);
    expect(rewardData).includes(word("700"));
  });

  it("sends native last, and only from a wallet this app controls", async () => {
    const portfolioHelper = getPortfolioHelper("Velodrome Vault");
    protocolsOn(portfolioHelper, "op").forEach((p) => {
      stubBalances(p.interface, { staked: "1000", wallet: "0" });
      stubNoRewards(p.interface);
    });
    const nativeBalance = ethers.utils.parseEther("1");
    getBalance.mockResolvedValue(nativeBalance);
    fetchWalletTokens.mockResolvedValue([
      { id: VELO, raw_amount_hex_str: "0x12c" },
    ]);
    const params = {
      account: OWNER,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      updateProgress: noop,
    };

    const sponsored = await portfolioHelper.getEmergencyExitTxnsByProtocol({
      ...params,
      aaOn: true,
    });
    const eoa = await portfolioHelper.getEmergencyExitTxnsByProtocol({
      ...params,
      aaOn: false,
    });

    expect(sponsored.length).toBeGreaterThan(1);
    expect(sponsored[sponsored.length - 1].uniqueId).toBe("native");
    const sponsoredTxn = sponsored[sponsored.length - 1].txns[0];
    expect(sponsoredTxn.to).toBe(RECIPIENT);
    expect(sponsoredTxn.value).toBe(BigInt(nativeBalance.toString()));

    // In EOA mode `account` is the user's own wallet holding whatever else they
    // keep there; they asked to exit positions, not to be emptied out.
    expect(eoa.every((group) => group.uniqueId !== "native")).toBe(true);
    expect(eoa.every((group) => group.uniqueId !== "wallet-tokens")).toBe(true);
    expect(eoa).toHaveLength(protocolsOn(portfolioHelper, "op").length);
  });

  it("rebuilds only the native group when the retry asks for it", async () => {
    const portfolioHelper = getPortfolioHelper("Velodrome Vault");
    const [protocol] = protocolsOn(portfolioHelper, "op").map(
      (p) => p.interface,
    );
    const emergencyTransfer = vi.spyOn(protocol, "emergencyTransfer");
    getBalance.mockResolvedValue(ethers.utils.parseEther("1"));

    const groups = await portfolioHelper.getEmergencyExitTxnsByProtocol({
      account: OWNER,
      chainMetadata: optimism,
      recipient: RECIPIENT,
      updateProgress: noop,
      uniqueIds: ["native"],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].uniqueId).toBe("native");
    expect(emergencyTransfer).not.toHaveBeenCalled();
    expect(fetchWalletTokens).not.toHaveBeenCalled();
  });
});
