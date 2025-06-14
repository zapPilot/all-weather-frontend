import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

// Store original environment variables
const originalEnv = { ...process.env };

// Mock general module
vi.mock("../utils/general", () => ({
  isLocalEnvironment: true, // Will be overridden in tests
}));

describe("Logger Utility", () => {
  let logger;

  beforeEach(() => {
    // Clear module cache to get fresh logger instance
    vi.resetModules();

    // Replace console methods with mocks
    console.log = mockConsole.log;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("Development Environment", () => {
    beforeEach(async () => {
      // Set development environment
      process.env.NODE_ENV = "development";
      process.env.TEST = "false";

      // Mock isLocalEnvironment as true for development
      vi.doMock("../utils/general", () => ({
        isLocalEnvironment: true,
      }));

      // Import logger after setting environment
      const loggerModule = await import("../utils/logger.js");
      logger = loggerModule.default;
    });

    it("should log messages in development", () => {
      logger.log("test message", { data: "value" });
      expect(mockConsole.log).toHaveBeenCalledWith("test message", {
        data: "value",
      });
    });

    it("should log warnings in development", () => {
      logger.warn("warning message");
      expect(mockConsole.warn).toHaveBeenCalledWith("warning message");
    });

    it("should log errors in development", () => {
      const error = new Error("test error");
      logger.error("error message", error);
      expect(mockConsole.error).toHaveBeenCalledWith("error message", error);
    });

    it("should handle timing in development", () => {
      // Mock Date.now to control time
      const mockNow = vi.spyOn(Date, "now");
      mockNow.mockReturnValueOnce(1000); // Start time
      logger.time("test-timer");
      expect(logger.timers.has("test-timer")).toBe(true);

      mockNow.mockReturnValueOnce(1500); // End time
      logger.timeEnd("test-timer");

      expect(mockConsole.log).toHaveBeenCalledWith("test-timer: 500ms");
      expect(logger.timers.has("test-timer")).toBe(false);

      mockNow.mockRestore();
    });

    it("should handle debug logging", () => {
      const testObj = { key: "value", nested: { data: 123 } };
      logger.debug("debug label", testObj);
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[DEBUG] debug label:",
        testObj,
      );
    });
  });

  describe("Test Environment", () => {
    beforeEach(async () => {
      process.env.NODE_ENV = "development";
      process.env.TEST = "true";

      // Mock isLocalEnvironment as true for test environment
      vi.doMock("../utils/general", () => ({
        isLocalEnvironment: true,
      }));

      const loggerModule = await import("../utils/logger.js");
      logger = loggerModule.default;
    });

    it("should not log in test environment", () => {
      logger.log("test message");
      logger.debug("debug message", {});
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it("should still log warnings in test environment", () => {
      logger.warn("warning message");
      expect(mockConsole.warn).toHaveBeenCalledWith("warning message");
    });

    it("should not handle timing in test environment", () => {
      logger.time("test-timer");
      logger.timeEnd("test-timer");
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe("Production Environment", () => {
    beforeEach(async () => {
      process.env.NODE_ENV = "production";
      process.env.TEST = "false";

      // Mock isLocalEnvironment as false for production
      vi.doMock("../utils/general", () => ({
        isLocalEnvironment: false,
      }));

      const loggerModule = await import("../utils/logger.js");
      logger = loggerModule.default;
    });

    it("should not log regular messages in production", () => {
      logger.log("test message");
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it("should not log warnings in production", () => {
      logger.warn("warning message");
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    it("should not log debug messages in production", () => {
      logger.debug("debug message", {});
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it("should simplify error objects in production", () => {
      const error = new Error("test error");
      const complexObj = {
        large: "object",
        nested: { deep: "data" },
      };

      logger.error("error message", error, complexObj);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "error message",
        "Error: test error",
        "[Object: Object]",
      );
    });

    it("should handle null and undefined in error simplification", () => {
      logger.error("error with null", null, undefined);
      expect(mockConsole.error).toHaveBeenCalledWith(
        "error with null",
        null,
        undefined,
      );
    });

    it("should not handle timing in production", () => {
      logger.time("test-timer");
      logger.timeEnd("test-timer");
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(logger.timers.size).toBe(0);
    });
  });

  describe("Special Methods", () => {
    beforeEach(async () => {
      process.env.NODE_ENV = "development";
      process.env.TEST = "false";

      vi.doMock("../utils/general", () => ({
        isLocalEnvironment: true,
      }));

      const loggerModule = await import("../utils/logger.js");
      logger = loggerModule.default;
    });

    it("should handle timeEnd without corresponding time call", () => {
      logger.timeEnd("nonexistent-timer");
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it("should handle trace logging with debug flag", () => {
      // Mock window object with debug flag
      global.window = {
        location: {
          search: "?debug=true",
        },
      };

      logger.trace("trace message", "data");
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[TRACE]",
        "trace message",
        "data",
      );

      // Cleanup
      delete global.window;
    });

    it("should not trace without debug flag", () => {
      global.window = {
        location: {
          search: "?other=param",
        },
      };

      logger.trace("trace message");
      expect(mockConsole.log).not.toHaveBeenCalled();

      delete global.window;
    });

    it("should handle missing window object for trace", () => {
      // Clear window object if it exists
      const originalWindow = global.window;
      delete global.window;

      logger.trace("trace message");
      expect(mockConsole.log).not.toHaveBeenCalled();

      // Restore window
      if (originalWindow) {
        global.window = originalWindow;
      }
    });
  });

  describe("Error Object Handling", () => {
    beforeEach(async () => {
      process.env.NODE_ENV = "production";
      process.env.TEST = "false";

      vi.doMock("../utils/general", () => ({
        isLocalEnvironment: false,
      }));

      const loggerModule = await import("../utils/logger.js");
      logger = loggerModule.default;
    });

    it("should handle different error types", () => {
      const typeError = new TypeError("type error");
      const syntaxError = new SyntaxError("syntax error");

      logger.error("errors:", typeError, syntaxError);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "errors:",
        "TypeError: type error",
        "SyntaxError: syntax error",
      );
    });

    it("should handle objects without constructor", () => {
      const objWithoutConstructor = Object.create(null);
      objWithoutConstructor.data = "test";

      logger.error("object without constructor:", objWithoutConstructor);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "object without constructor:",
        "[Object: Unknown]",
      );
    });

    it("should handle primitive values in production", () => {
      logger.error("primitives:", "string", 123, true);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "primitives:",
        "string",
        123,
        true,
      );
    });
  });

  describe("Timer Management", () => {
    beforeEach(async () => {
      process.env.NODE_ENV = "development";
      process.env.TEST = "false";

      vi.doMock("../utils/general", () => ({
        isLocalEnvironment: true,
      }));

      const loggerModule = await import("../utils/logger.js");
      logger = loggerModule.default;
    });

    it("should manage multiple timers", () => {
      const mockNow = vi.spyOn(Date, "now");

      mockNow.mockReturnValueOnce(1000);
      logger.time("timer1");

      mockNow.mockReturnValueOnce(2000);
      logger.time("timer2");

      expect(logger.timers.size).toBe(2);

      mockNow.mockReturnValueOnce(3000);
      logger.timeEnd("timer1");

      expect(mockConsole.log).toHaveBeenCalledWith("timer1: 2000ms");
      expect(logger.timers.size).toBe(1);
      expect(logger.timers.has("timer2")).toBe(true);

      mockNow.mockRestore();
    });

    it("should clear timers map when logger is reused", () => {
      logger.time("test1");
      logger.time("test2");
      expect(logger.timers.size).toBe(2);

      logger.timers.clear();
      expect(logger.timers.size).toBe(0);
    });
  });
});
