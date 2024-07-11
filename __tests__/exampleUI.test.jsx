import { vi, expect, describe, it, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "./test-utils.tsx";
import ExampleUI from "../pages/views/ExampleUI";
import axios from "axios";
import { fetchApr } from './fetchMock.js'

vi.mock("axios");

describe("ExampleUI Component", () => {
  afterEach(async () => {
    // Restore all mocks after each test
    vi.restoreAllMocks()
  
  })

  // Mock the rejected promise
  it('Should handle Axios rejected promise', async () => {
    // Mock Axios request form the fetchApr function
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Failed to fetch'))
    await expect(fetchApr()).rejects.toThrow('Failed to fetch')
  })

  // Mock the resolved promise
  it('Should handle Axios resolved promise', async () => {
    // Mock Axios request form the fetchApr function
    vi.spyOn(axios, 'get').mockResolvedValue({ portfolio_apr: 5 })
    await expect(fetchApr()).resolves.toBe(5);
  })

  it("display portfolio_apr value", async () => {
    // Render the ExampleUI component
    render(<ExampleUI />);

    waitFor(() => {
      // Wait for the portfolio_apr element to be displayed
      const aprElement = screen.findByTestId("apr");
      expect(aprElement).toBeInTheDocument;
    });

    waitFor(() => {
      // Wait for the portfolio_apr element to contain the value
      const aprElement = screen.findByTestId("apr");
      const aprValue = aprElement.textContent;
      // aprValue should be a number with a percentage sign
      expect(aprValue).toBe("5%");
    }, { timeout: 10000 });
  });
});
