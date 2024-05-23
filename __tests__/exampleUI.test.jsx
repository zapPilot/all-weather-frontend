import { vi, expect, describe, it } from "vitest";
import { render, screen } from "./test-utils";
import ExampleUI from "../pages/views/ExampleUI";

describe("ExampleUI Component", () => {
  it("display portfolio_apr value", async () => {
    // Mock the fetch API
    vi.mock("node-fetch", () => {
      return {
        default: vi.fn(() =>
          Promise.resolve({
            json: () =>
              Promise.resolve({
                data: [
                  {
                    subscriptionStatus: false,
                  },
                ],
              }),
          }),
        ),
      };
    });
    // Render the ExampleUI component
    render(<ExampleUI />);
    try {
      // Wait for the portfolio_apr element to be displayed
      const aprElement = await screen.findByTestId("apr");
      const aprNumber = Number(aprElement.textContent);
      expect(aprNumber).toBeGreaterThan(0);
    } catch (error) {
      const aprElement = await screen.findByTestId("apr");
      const aprText = aprElement.textContent;
      expect(aprText).toBe("  ");
    }
  });
});
