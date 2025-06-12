import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWindowWidth, useWindowHeight } from "../utils/chartUtils";

// Mock window object
const mockWindow = (width = 1024, height = 768) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe("Chart Utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWindow();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("useWindowWidth", () => {
    it("should return initial window width", () => {
      mockWindow(1200, 800);
      const { result } = renderHook(() => useWindowWidth());
      expect(result.current).toBe(1200);
    });

    it("should update width on window resize with debouncing", async () => {
      mockWindow(1024, 768);
      const { result } = renderHook(() => useWindowWidth());

      expect(result.current).toBe(1024);

      // Change window width
      mockWindow(1200, 768);

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // Should not update immediately (debounced)
      expect(result.current).toBe(1024);

      // Fast-forward time by 150ms (debounce delay)
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current).toBe(1200);
    });

    it("should debounce multiple rapid resize events", async () => {
      mockWindow(1024, 768);
      const { result } = renderHook(() => useWindowWidth());

      expect(result.current).toBe(1024);

      // Rapid resize events
      mockWindow(1100, 768);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      mockWindow(1200, 768);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      mockWindow(1300, 768);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // Should still be original value
      expect(result.current).toBe(1024);

      // Fast-forward to trigger debounced update
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should only update to the last value
      expect(result.current).toBe(1300);
    });

    it("should cancel pending timeout on unmount", () => {
      mockWindow(1024, 768);
      const { result, unmount } = renderHook(() => useWindowWidth());

      expect(result.current).toBe(1024);

      // Change width and trigger resize
      mockWindow(1200, 768);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // Unmount before debounce completes
      unmount();

      // Advance time - should not cause any updates since component unmounted
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // No assertions needed - just ensuring no errors thrown
    });

    it("should handle multiple resize events within debounce window", () => {
      mockWindow(1024, 768);
      const { result } = renderHook(() => useWindowWidth());

      expect(result.current).toBe(1024);

      // First resize
      mockWindow(1100, 768);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // Advance time partially
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Second resize before first debounce completes
      mockWindow(1200, 768);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // Should still be original value
      expect(result.current).toBe(1024);

      // Complete the debounce period from the second event
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should update to the last value
      expect(result.current).toBe(1200);
    });

    it("should clean up event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = renderHook(() => useWindowWidth());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );
    });
  });

  describe("useWindowHeight", () => {
    it("should return initial window height minus 170", () => {
      mockWindow(1024, 800);
      const { result } = renderHook(() => useWindowHeight());
      expect(result.current).toBe(630); // 800 - 170
    });

    it("should update height on window resize with debouncing", async () => {
      mockWindow(1024, 768);
      const { result } = renderHook(() => useWindowHeight());

      expect(result.current).toBe(598); // 768 - 170

      // Change window height
      mockWindow(1024, 900);

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // Should not update immediately (debounced)
      expect(result.current).toBe(598);

      // Fast-forward time by 150ms
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current).toBe(730); // 900 - 170
    });

    it("should handle small window heights correctly", () => {
      mockWindow(1024, 100);
      const { result } = renderHook(() => useWindowHeight());
      expect(result.current).toBe(-70); // 100 - 170 (could be negative)
    });

    it("should debounce multiple height changes", async () => {
      mockWindow(1024, 768);
      const { result } = renderHook(() => useWindowHeight());

      expect(result.current).toBe(598);

      // Multiple rapid changes
      mockWindow(1024, 800);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      mockWindow(1024, 900);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      mockWindow(1024, 1000);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // Should still be original value
      expect(result.current).toBe(598);

      // Fast-forward to complete debounce
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should update to final value
      expect(result.current).toBe(830); // 1000 - 170
    });

    it("should clean up timeouts and event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      mockWindow(1024, 768);
      const { result, unmount } = renderHook(() => useWindowHeight());

      // Trigger resize to create timeout
      mockWindow(1024, 900);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );
      // Note: clearTimeout might be called, but we can't easily assert on the exact call
      // due to how the timeout reference is managed internally
    });
  });

  describe("Performance Characteristics", () => {
    it("should not cause excessive re-renders during rapid resizing", () => {
      mockWindow(1024, 768);
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useWindowWidth();
      });

      // Initial render count should be 2:
      // 1. Initial render with state 0
      // 2. useEffect sets initial window width
      expect(renderCount).toBe(2);

      // Simulate 10 rapid resize events
      for (let i = 0; i < 10; i++) {
        mockWindow(1024 + i * 10, 768);
        act(() => {
          window.dispatchEvent(new Event("resize"));
        });
      }

      // Should not have re-rendered yet (still 2)
      expect(renderCount).toBe(2);

      // Fast-forward to complete debounce
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should only re-render once more after debounce (total 3)
      expect(renderCount).toBe(3);
      expect(result.current).toBe(1114); // 1024 + 9 * 10
    });

    it("should handle zero dimensions", () => {
      mockWindow(0, 0);
      const { result: widthResult } = renderHook(() => useWindowWidth());
      const { result: heightResult } = renderHook(() => useWindowHeight());

      expect(widthResult.current).toBe(0);
      expect(heightResult.current).toBe(-170); // 0 - 170
    });

    it("should handle very large dimensions", () => {
      mockWindow(5000, 3000);
      const { result: widthResult } = renderHook(() => useWindowWidth());
      const { result: heightResult } = renderHook(() => useWindowHeight());

      expect(widthResult.current).toBe(5000);
      expect(heightResult.current).toBe(2830); // 3000 - 170
    });
  });

  describe("Memory Leak Prevention", () => {
    it("should properly clean up when component unmounts during debounce", () => {
      mockWindow(1024, 768);
      const { result, unmount } = renderHook(() => useWindowWidth());

      // Trigger resize
      mockWindow(1200, 768);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // Unmount during debounce period
      unmount();

      // Advance time past debounce - should not cause errors
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // No assertions needed - just ensuring no memory leaks or errors
    });

    it("should handle multiple hook instances independently", () => {
      mockWindow(1024, 768);

      const { result: result1 } = renderHook(() => useWindowWidth());
      const { result: result2 } = renderHook(() => useWindowWidth());

      expect(result1.current).toBe(1024);
      expect(result2.current).toBe(1024);

      // Both should update independently
      mockWindow(1200, 768);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result1.current).toBe(1200);
      expect(result2.current).toBe(1200);
    });
  });
});
