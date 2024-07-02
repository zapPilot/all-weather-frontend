import { expect, describe, it } from "vitest";
import { render, screen } from "./test-utils";
import RoutesPreview from "../pages/RoutesPreview";
import userEvent from "@testing-library/user-event";

describe("RoutesPreview Component", () => {
  it("Make sure there's Sign Button", async () => {
    // Render the Dashboard component
    render(
      <RoutesPreview
        portfolioName="AllWeatherPortfolio"
        investmentAmount={10000}
        chosenToken={""}
        role="portfolio_in_transaction_preview"
      />,
    );

    // Check if "Invest Now!" button exists
    const investButtons = screen.getAllByText(/Invest Now!/i);
    expect(investButtons.length).to.equal(1);

    // Create a user event instance
    const user = userEvent.setup();

    // Click the "Invest Now!" button
    await user.click(investButtons[0]);

    // Check for the "Sign!" button after clicking
    const signButtons = await screen.findAllByText(/Sign/i);
    expect(signButtons.length).to.equal(1);
  });
});
