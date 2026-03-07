import { expect, describe, it } from "vitest";
import { render, screen } from "./test-utils.tsx";
import APRPopOver from "../views/APRPopOver";

describe("APRPopOver Component", () => {
  it("Test its default rendering", async () => {
    render(<APRPopOver />);
    // It would be hidden if the missing pools are empty
    const popoverExists = await screen.queryByRole("aprpopover");
    expect(popoverExists).toBeNull();
  });
});
