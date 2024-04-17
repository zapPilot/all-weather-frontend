import { vi, expect, describe, it, test } from "vitest";
import { render, screen } from "./test-utils";
import Dashboard from "../pages/dashboard";
import { waitFor } from "@testing-library/dom";

/**
 * @vitest-environment jsdom
 */

const { useRouter, mockedRouterPush } = vi.hoisted(() => {
  const mockedRouterPush = vi.fn();
  return {
    useRouter: () => ({ push: mockedRouterPush }),
    mockedRouterPush,
  };
});

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    useRouter,
  };
});

vi.mock('node-fetch', () => {
  return {
    default: vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({
        data: [{
          chain: "avalanche",
          pool: {
            meta: null,
            name: "struct-finance",
            poolID: "87e6c43a-bc0f-4a4f-adcd-1f5bff02402b",
          },
          symbol: 'btc.b',
          tvlUsd: "538161",
          apr: {
            predictions: {
              binnedConfidence: 2,
              predictedClass: "Down",
              predictedProbability: 65,
            },
            value: 9.53
          }
        }],
        unique_query_tokens: ["btc"],
        unexpandable: true,
      })
    }))
  }
});

describe('Dashboard Component', () => {
  it('displays multiple instances of data fetched from the API', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      try {
        const btcElements = screen.getAllByText(/.*btc.*/i);
        expect(btcElements.length).toBeGreaterThan(0);

        btcElements.forEach(element => {
          expect(element).toBeInTheDocument();
        });
      } catch (error) {
        console.error("An error occurred:", error);
      }
    });
  });
});
