import { describe, it, expect } from "vitest";
import { AA_EXIT_CHAINS, AA_EXIT_VAULTS } from "../../utils/aaExit";
import {
  RETIRED_POSITION_COUNT,
  retiredExitPositions,
} from "../../utils/retiredExitPositions";
import { getPortfolioHelper } from "../../utils/thirdwebSmartWallet.ts";

const vaultUniqueIdsOn = (chainName) =>
  new Set(
    AA_EXIT_VAULTS.flatMap((vaultName) =>
      Object.values(getPortfolioHelper(vaultName)?.strategy || {}).flatMap(
        (categories) =>
          Object.entries(categories || {})
            .filter(([chainKey]) => chainKey.toLowerCase() === chainName)
            .flatMap(([, list]) =>
              (list || []).map((protocol) => protocol.interface.uniqueId()),
            ),
      ),
    ),
  );

const everyRetiredPosition = () =>
  AA_EXIT_CHAINS.flatMap((chainName) => retiredExitPositions(chainName));

describe("retiredExitPositions", () => {
  // A retired entry that has come back into a vault strategy is dead weight, and
  // collectExitProtocols would dedupe it away silently — leaving a stale copy of
  // its parameters here for whoever reads the list next
  it("lists nothing a vault strategy already covers", () => {
    AA_EXIT_CHAINS.forEach((chainName) => {
      const fromVaults = vaultUniqueIdsOn(chainName);
      retiredExitPositions(chainName).forEach((position) =>
        expect(fromVaults.has(position.uniqueId())).toBe(false),
      );
    });
  });

  // A position retired onto a chain the page never scans can never be rescued,
  // so it would read as covered while being unreachable
  it("strands nothing on a chain the exit page cannot scan", () => {
    expect(everyRetiredPosition()).toHaveLength(RETIRED_POSITION_COUNT);
  });

  // The whole list is built on every scan, so one bad constructor would be a
  // warning in the console rather than a visible failure
  it("builds every position without throwing", () => {
    everyRetiredPosition().forEach((position) => {
      expect(position.uniqueId()).toBeTruthy();
      expect(position.chain).toBeTruthy();
    });
  });

  // The exit hands over whatever sweptAssetAddress names, so a wrong or missing
  // asset address moves the wrong token (NFT positions report null by design)
  it("knows which asset each position hands over", () => {
    everyRetiredPosition().forEach((position) => {
      const asset = position.sweptAssetAddress();
      if (position.assetIsNFT) {
        expect(asset).toBeNull();
      } else {
        expect(asset).toMatch(/^0x[0-9a-fA-F]{40}$/);
      }
    });
  });
});
