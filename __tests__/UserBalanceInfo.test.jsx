import { expect, describe, it } from "vitest";
import { render, screen } from "./test-utils";
import UserBalanceInfo from "../pages/views/UserBalanceInfo";

describe("UserBalanceInfo Component", () => {
  it("Test its default rendering", async () => {
    render(<UserBalanceInfo />);
    const monthly_interest = await screen.findAllByRole("monthly_interest");
    expect(monthly_interest).toHaveLength(1);
  });
});
