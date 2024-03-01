// sum.test.js
import { expect, test } from "vitest";
import { chainIDToName } from "../utils/contractInteractions";

test("chainIDToName with valid chain ID", () => {
  expect(chainIDToName(56)).toBe("bsc");
});

test("chainIDToName with invalid chain ID", () => {
  expect(() => chainIDToName(5566)).toThrow(new Error("Unsupported Chain")); // Expect function to throw
});
