import { vi, expect, describe, it, afterEach } from "vitest";
import { render, screen, waitFor } from "./test-utils.tsx";
import ExampleUI from "../pages/views/ExampleUI";
import axios from "axios";
import { fetchApr } from "./fetchMock.js";

vi.mock("axios");

describe("ExampleUI Component", () => {
  afterEach(async () => {
    // Restore all mocks after each test
    vi.restoreAllMocks();
  });

  // Mock the rejected promise
  it("Should handle Axios rejected promise", async () => {
    // Mock Axios request form the fetchApr function
    vi.spyOn(axios, "get").mockRejectedValue(new Error("Failed to fetch"));
    await expect(fetchApr()).rejects.toThrow("Failed to fetch");
  });

  // Mock the resolved promise
  it("Should handle Axios resolved promise", async () => {
    // Mock Axios request form the fetchApr function
    vi.spyOn(axios, "get").mockResolvedValue({ portfolio_apr: 5 });
    await expect(fetchApr()).resolves.toBe(5);
  });

  it("should display portfolio APR value", async () => {
    // Mock the API response
    vi.spyOn(axios, "get").mockResolvedValue({ portfolio_apr: 5 });

    // Render the component
    render(<ExampleUI />);

    // Wait for the APR element to be present and check its value
    await waitFor(
      async () => {
        const aprElements = await screen.findAllByTestId("apr");
        expect(aprElements.length).toBeGreaterThan(0);

        // Check if any of the APR elements contains the expected value
        const hasExpectedValue = aprElements.some((element) =>
          element.textContent.includes("%"),
        );
        expect(hasExpectedValue).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});
