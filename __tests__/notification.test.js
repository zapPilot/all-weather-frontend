import { describe, it, expect, vi, beforeEach } from "vitest";
import openNotificationWithIcon from "../utils/notification.js";

describe("Notification Utils", () => {
  let mockAPI;

  beforeEach(() => {
    mockAPI = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    };
  });

  describe("openNotificationWithIcon", () => {
    it("should call success notification with correct parameters", () => {
      const title = "Success!";
      const type = "success";
      const message = "Operation completed successfully";

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.success).toHaveBeenCalledWith({
        message: title,
        description: message,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
      expect(mockAPI.error).not.toHaveBeenCalled();
      expect(mockAPI.warning).not.toHaveBeenCalled();
      expect(mockAPI.info).not.toHaveBeenCalled();
    });

    it("should call error notification with correct parameters", () => {
      const title = "Error!";
      const type = "error";
      const message = "Something went wrong";

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.error).toHaveBeenCalledWith({
        message: title,
        description: message,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
      expect(mockAPI.success).not.toHaveBeenCalled();
      expect(mockAPI.warning).not.toHaveBeenCalled();
      expect(mockAPI.info).not.toHaveBeenCalled();
    });

    it("should call warning notification with correct parameters", () => {
      const title = "Warning!";
      const type = "warning";
      const message = "Please check your input";

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.warning).toHaveBeenCalledWith({
        message: title,
        description: message,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
      expect(mockAPI.success).not.toHaveBeenCalled();
      expect(mockAPI.error).not.toHaveBeenCalled();
      expect(mockAPI.info).not.toHaveBeenCalled();
    });

    it("should call info notification with correct parameters", () => {
      const title = "Info";
      const type = "info";
      const message = "Here's some information";

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.info).toHaveBeenCalledWith({
        message: title,
        description: message,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
      expect(mockAPI.success).not.toHaveBeenCalled();
      expect(mockAPI.error).not.toHaveBeenCalled();
      expect(mockAPI.warning).not.toHaveBeenCalled();
    });

    it("should handle empty title and message", () => {
      const title = "";
      const type = "success";
      const message = "";

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.success).toHaveBeenCalledWith({
        message: "",
        description: "",
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
    });

    it("should handle null values gracefully", () => {
      const title = null;
      const type = "error";
      const message = null;

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.error).toHaveBeenCalledWith({
        message: null,
        description: null,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
    });

    it("should handle undefined values gracefully", () => {
      const title = undefined;
      const type = "warning";
      const message = undefined;

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.warning).toHaveBeenCalledWith({
        message: undefined,
        description: undefined,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
    });

    it("should handle long titles and messages", () => {
      const title = "A".repeat(100);
      const type = "info";
      const message = "B".repeat(500);

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.info).toHaveBeenCalledWith({
        message: title,
        description: message,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
    });

    it("should handle special characters in title and message", () => {
      const title = "🎉 Success! 🎊";
      const type = "success";
      const message = "Operation completed with 100% accuracy! ✅";

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.success).toHaveBeenCalledWith({
        message: title,
        description: message,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
    });

    it("should always use the same fixed configuration", () => {
      const calls = [
        ["Title 1", "success", "Message 1"],
        ["Title 2", "error", "Message 2"],
        ["Title 3", "warning", "Message 3"],
        ["Title 4", "info", "Message 4"],
      ];

      calls.forEach(([title, type, message]) => {
        openNotificationWithIcon(mockAPI, title, type, message);
      });

      // Verify all calls have the same configuration structure
      const allCalls = [
        ...mockAPI.success.mock.calls,
        ...mockAPI.error.mock.calls,
        ...mockAPI.warning.mock.calls,
        ...mockAPI.info.mock.calls,
      ];

      allCalls.forEach((call) => {
        expect(call[0]).toHaveProperty("showProgress", true);
        expect(call[0]).toHaveProperty("pauseOnHover", true);
        expect(call[0]).toHaveProperty("duration", 1500000);
      });
    });

    it("should work with custom API objects that have the notification methods", () => {
      const customAPI = {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
        customMethod: vi.fn(), // Additional method should not interfere
      };

      openNotificationWithIcon(customAPI, "Test", "success", "Test message");

      expect(customAPI.success).toHaveBeenCalledTimes(1);
      expect(customAPI.customMethod).not.toHaveBeenCalled();
    });

    it("should handle numeric titles and messages", () => {
      const title = 123;
      const type = "info";
      const message = 456;

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.info).toHaveBeenCalledWith({
        message: 123,
        description: 456,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
    });

    it("should handle boolean titles and messages", () => {
      const title = true;
      const type = "error";
      const message = false;

      openNotificationWithIcon(mockAPI, title, type, message);

      expect(mockAPI.error).toHaveBeenCalledWith({
        message: true,
        description: false,
        showProgress: true,
        pauseOnHover: true,
        duration: 1500000,
      });
    });

    it("should work with different notification type strings", () => {
      const testCases = [
        { type: "success", method: "success" },
        { type: "error", method: "error" },
        { type: "warning", method: "warning" },
        { type: "info", method: "info" },
      ];

      testCases.forEach(({ type, method }, index) => {
        openNotificationWithIcon(
          mockAPI,
          `Title ${index}`,
          type,
          `Message ${index}`,
        );
        expect(mockAPI[method]).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle API object without required methods gracefully", () => {
      const incompleteAPI = {
        success: vi.fn(),
        // Missing error, warning, info methods
      };

      // This should throw an error when trying to call a non-existent method
      expect(() => {
        openNotificationWithIcon(
          incompleteAPI,
          "Test",
          "error",
          "Test message",
        );
      }).toThrow();
    });

    it("should handle null API object", () => {
      expect(() => {
        openNotificationWithIcon(null, "Test", "success", "Test message");
      }).toThrow();
    });

    it("should handle undefined API object", () => {
      expect(() => {
        openNotificationWithIcon(undefined, "Test", "success", "Test message");
      }).toThrow();
    });

    it("should handle invalid notification type", () => {
      expect(() => {
        openNotificationWithIcon(
          mockAPI,
          "Test",
          "invalidType",
          "Test message",
        );
      }).toThrow();
    });

    it("should handle API methods that throw errors", () => {
      const errorAPI = {
        success: vi.fn(() => {
          throw new Error("Notification failed");
        }),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
      };

      expect(() => {
        openNotificationWithIcon(errorAPI, "Test", "success", "Test message");
      }).toThrow("Notification failed");
    });
  });
});
