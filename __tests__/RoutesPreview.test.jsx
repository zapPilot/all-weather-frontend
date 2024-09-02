import { expect, describe, it } from "vitest";
import { render, screen } from "./test-utils";
import ExampleUI from "../pages/views/ExampleUI";
import userEvent from "@testing-library/user-event";

describe("RoutesPreview Component", () => {
  it("Make sure there's Sign Button", async () => {
    render(<ExampleUI />);

    // Check if "Invest Now!" button exists
    const investButtons = screen.getAllByText(/Invest Now!/i);
    expect(investButtons.length).to.equal(1);

    // Create a user event instance
    const user = userEvent.setup();

    // Click the "Invest Now!" button
    await user.click(investButtons[0]);
  });
});
