import { describe, expect, it } from "vitest";
import { createLogger } from "../logger.js";

describe("PinoLogger", () => {
  it("should create logger with context", () => {
    const logger = createLogger("TestContext");
    expect(logger).toBeDefined();
  });

  it("should log debug messages without throwing", () => {
    const logger = createLogger("TestContext");
    expect(() => {
      logger.debug("test message", { key: "value" });
    }).not.toThrow();
  });

  it("should log info messages without throwing", () => {
    const logger = createLogger("TestContext");
    expect(() => {
      logger.info("test message");
    }).not.toThrow();
  });

  it("should log warn messages without throwing", () => {
    const logger = createLogger("TestContext");
    expect(() => {
      logger.warn("test message");
    }).not.toThrow();
  });

  it("should log error messages without throwing", () => {
    const logger = createLogger("TestContext");
    expect(() => {
      logger.error("test message");
    }).not.toThrow();
  });

  it("should handle messages with context data", () => {
    const logger = createLogger("TestContext");
    expect(() => {
      logger.info("test message", { userId: "123", action: "login" });
    }).not.toThrow();
  });

  it("should handle messages with null context", () => {
    const logger = createLogger("TestContext");
    expect(() => {
      logger.info("test message", undefined as unknown as Record<string, unknown>);
    }).not.toThrow();
  });
});

describe("createLogger", () => {
  it("should create a logger instance", () => {
    const logger = createLogger("TestContext");
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("should create unique logger instances for different contexts", () => {
    const logger1 = createLogger("Context1");
    const logger2 = createLogger("Context2");
    expect(logger1).not.toBe(logger2);
  });
});
