import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { PriceService, TokenPriceBatcher } from "../classes/TokenPriceService";

// Mock axios
vi.mock("axios");

describe("PriceService", () => {
  let priceService;

  beforeEach(() => {
    priceService = new PriceService("http://api.example.com");
    // Clear mocks before each test
    vi.clearAllMocks();
  });

  it("should fetch price from geckoterminal successfully", async () => {
    const mockPrice = 789.1;
    axios.get.mockResolvedValueOnce({ data: { price: mockPrice } });

    const price = await priceService.fetchPrice("ETH", {
      geckoterminal: { chain: "ethereum", address: "0x123" },
    });

    expect(price).toBe(mockPrice);
    expect(axios.get).toHaveBeenCalledWith(
      "http://api.example.com/token/ethereum/0x123/price",
      expect.any(Object),
    );
  });
});
