import { describe, it, expect } from "vitest";
import { BasePortfolio } from "../../classes/BasePortfolio";
import { ethers } from "ethers";
describe("SwapFee rates", () => {
  it("mulSwapFeeRate and swapFeeRate should be equivalent", () => {
    const testInstance = new BasePortfolio(
      {
        long_term_bond: {
          arbitrum: [],
        },
      },
      {
        long_term_bond: 1,
      },
    ); // Replace with your actual class name
    const testValue = ethers.utils.parseUnits("1", 18); // 1 unit with 18 decimals

    const bigNumberResult = testInstance.mulSwapFeeRate(testValue);
    const regularResult = testInstance.swapFeeRate();

    // Convert BigNumber result to a comparable number
    const bigNumberAsFloat = parseFloat(
      ethers.utils.formatUnits(bigNumberResult, 18),
    );

    // Use a small epsilon for floating-point comparison
    const epsilon = 1e-15;

    expect(Math.abs(bigNumberAsFloat - regularResult)).to.be.lessThan(epsilon);
  });
  it("mulReferralFeeRate and referralFeeRate should be equivalent", () => {
    const testInstance = new BasePortfolio(
      {
        long_term_bond: {
          arbitrum: [],
        },
      },
      {
        long_term_bond: 1,
      },
    ); // Replace with your actual class name
    const testValue = ethers.utils.parseUnits("1", 18); // 1 unit with 18 decimals

    const bigNumberResult = testInstance.mulReferralFeeRate(testValue);
    const regularResult = testInstance.referralFeeRate();

    // Convert BigNumber result to a comparable number
    const bigNumberAsFloat = parseFloat(
      ethers.utils.formatUnits(bigNumberResult, 18),
    );

    // Use a small epsilon for floating-point comparison
    const epsilon = 1e-15;

    expect(Math.abs(bigNumberAsFloat - regularResult)).to.be.lessThan(epsilon);
  });
});
