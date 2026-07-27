import { describe, it, expect, vi } from "vitest";
import { ethers } from "ethers";
import { encode } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";

const OWNER = "0xc774806f9fF5f3d8aaBb6b70d0Ed509e42aFE6F0";
const RECIPIENT = "0x1234567890123456789012345678901234567890";
// transfer(address,uint256)
const TRANSFER_SELECTOR = "a9059cbb";
// Gauge.withdraw(uint256)
const WITHDRAW_SELECTOR = "2e1a7d4d";
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

describe("emergencyTransfer", () => {
  it("unstakes and transfers the full staked balance", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000000000000000000", wallet: "0" });

    const txns = await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

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

    const txns = await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

    expect(txns).toHaveLength(2);
    expect(await encode(txns[1])).includes(word("1000"));
  });

  it("skips the unstake txn when nothing is staked", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "0", wallet: "500" });

    const txns = await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

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

    expect(await protocol.emergencyTransfer(OWNER, RECIPIENT, noop)).toEqual(
      [],
    );
  });

  it("never reads token prices", async () => {
    const [protocol] = protocolsOn(
      getPortfolioHelper("Velodrome Vault"),
      "op",
    ).map((p) => p.interface);
    stubBalances(protocol, { staked: "1000", wallet: "0" });
    const usdBalanceOf = vi.spyOn(protocol, "usdBalanceOf");
    const assetUsdPrice = vi.spyOn(protocol, "assetUsdPrice");

    await protocol.emergencyTransfer(OWNER, RECIPIENT, noop);

    expect(usdBalanceOf).not.toHaveBeenCalled();
    expect(assetUsdPrice).not.toHaveBeenCalled();
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

  it("never fetches the token price mapping table", async () => {
    const portfolioHelper = getPortfolioHelper("Velodrome Vault");
    protocolsOn(portfolioHelper, "op").forEach((p) =>
      stubBalances(p.interface, { staked: "1000", wallet: "0" }),
    );
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
    protocols.forEach((protocol) =>
      stubBalances(protocol, { staked: "1000", wallet: "0" }),
    );
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
});
