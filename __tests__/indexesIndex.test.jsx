import { vi, expect, describe, it } from "vitest";
import { render, screen } from "./test-utils.tsx";
import IndexesIndex from "../pages/indexes/index.jsx";

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

describe("Indexes Component", () => {
  it("fetch indexes data", async () => {
    render(<IndexesIndex />);
    const indexesAprElements = await screen.findAllByRole("apr");
    indexesAprElements.forEach((element) => {
      // Check if the APR is shown
      expect(element.textContent).not.toBe("");
    });
  });
});
