import { expect, describe, it } from "vitest";
import { render, screen } from "./test-utils";
import APRPopOver from "../pages/views/APRPopOver";

describe("APRPopOver Component", () => {
  it("Test its default rendering", async () => {
    render(<APRPopOver />);
    const popover = await screen.findAllByRole("aprpopover");
    expect(popover).toHaveLength(1);
  });
});
