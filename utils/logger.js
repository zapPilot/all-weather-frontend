// Production-safe logging utility
const isDevelopment =
  process.env.NODE_ENV === "development" || process.env.TEST === "true";
const isTest = process.env.TEST === "true";

class Logger {
  constructor() {
    this.timers = new Map();
  }

  log(...args) {
    if (isDevelopment && !isTest) {
      console.log(...args);
    }
  }

  warn(...args) {
    if (isDevelopment) {
      console.warn(...args);
    }
  }

  error(...args) {
    // Always log errors, but limit object depth in production
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, log simplified error messages
      const simplifiedArgs = args.map((arg) => {
        if (typeof arg === "object" && arg !== null) {
          if (arg instanceof Error) {
            return `${arg.name}: ${arg.message}`;
          }
          return `[Object: ${arg.constructor?.name || "Unknown"}]`;
        }
        return arg;
      });
      console.error(...simplifiedArgs);
    }
  }

  time(label) {
    if (isDevelopment && !isTest) {
      this.timers.set(label, Date.now());
    }
  }

  timeEnd(label) {
    if (isDevelopment && !isTest) {
      const startTime = this.timers.get(label);
      if (startTime) {
        const duration = Date.now() - startTime;
        console.log(`${label}: ${duration}ms`);
        this.timers.delete(label);
      }
    }
  }

  // For debugging large objects - only in development
  debug(label, obj) {
    if (isDevelopment && !isTest) {
      console.log(`[DEBUG] ${label}:`, obj);
    }
  }

  // Performance-safe logging for frequently called functions
  trace(...args) {
    if (
      isDevelopment &&
      !isTest &&
      window?.location?.search?.includes("debug=true")
    ) {
      console.log("[TRACE]", ...args);
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
