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
    render(
      <IndexesIndex
        vaults={[
          {
            id: 3,
            portfolioName: "Metis Vault",
            href: "/indexes/indexOverviews/?portfolioName=Metis+Vault",
            imageSrc: "metis",
            imageAlt: "Metis Vault",
            apr: 100,
            tvl: 100,
          },
        ]}
      />,
    );
    const indexesAprElements = await screen.findAllByRole("apr");
    indexesAprElements.forEach((element) => {
      // Check if the APR is shown
      expect(element.textContent).not.toBe("");
    });
  });
});
