import { describe, expect, it } from "vitest";
import { getDefaultConfig } from "../processor-config.js";

describe("processor-config", () => {
  describe("getDefaultConfig", () => {
    it("should return default configuration", () => {
      const config = getDefaultConfig();
      expect(config).toEqual({
        maxWorkers: 5,
        maxRetries: 3,
        backoffBaseMs: 100,
        backoffMultiplier: 2,
      });
    });

    it("should return a new object each time", () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});
