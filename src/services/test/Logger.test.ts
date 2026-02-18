import { describe, expect, it, vi } from "vitest";
import type { LogEntry } from "../../types/index.js";
import { ConsoleLogger, createLogger } from "../Logger.js";

describe("ConsoleLogger", () => {
  it("should create logger with context", () => {
    const logger = new ConsoleLogger("TestContext");
    expect(logger).toBeDefined();
  });

  it("should log debug messages", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new ConsoleLogger("TestContext");
    logger.debug("test message", { key: "value" });
    expect(consoleSpy).toHaveBeenCalled();
    const logged: LogEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(logged.level).toBe("debug");
    expect(logged.message).toBe("[TestContext] test message");
    expect(logged.context).toEqual({ key: "value" });
    consoleSpy.mockRestore();
  });

  it("should log info messages", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new ConsoleLogger("TestContext");
    logger.info("test message");
    expect(consoleSpy).toHaveBeenCalled();
    const logged: LogEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(logged.level).toBe("info");
    consoleSpy.mockRestore();
  });

  it("should log warn messages", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = new ConsoleLogger("TestContext");
    logger.warn("test message");
    expect(consoleSpy).toHaveBeenCalled();
    const logged: LogEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(logged.level).toBe("warn");
    consoleSpy.mockRestore();
  });

  it("should log error messages", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = new ConsoleLogger("TestContext");
    logger.error("test message");
    expect(consoleSpy).toHaveBeenCalled();
    const logged: LogEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(logged.level).toBe("error");
    consoleSpy.mockRestore();
  });

  it("should include timestamp in log entry", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new ConsoleLogger("TestContext");
    logger.info("test message");
    const logged: LogEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(logged.timestamp).toBeDefined();
    expect(new Date(logged.timestamp)).toBeInstanceOf(Date);
    consoleSpy.mockRestore();
  });
});

describe("createLogger", () => {
  it("should create a ConsoleLogger instance", () => {
    const logger = createLogger("TestContext");
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });
});
