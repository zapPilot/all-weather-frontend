import { expect, describe, it } from "vitest";
import { render, screen } from "./test-utils.tsx";
import SubscribeWording from "../pages/views/SubscribeWording";

describe("SubscribeWording Component", () => {
  it("Test its default rendering", async () => {
    render(<SubscribeWording />);
    const subscribe_link = await screen.findAllByRole("subscribe_link");
    expect(subscribe_link).toHaveLength(1);
  });
});
