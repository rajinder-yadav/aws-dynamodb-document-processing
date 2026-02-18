import { describe, expect, it } from "vitest";
import { createDynamoDBClientConfig, getDynamoDBConfig } from "../config.js";

describe("config", () => {
  describe("getDynamoDBConfig", () => {
    it("should return default values when env vars are not set", () => {
      const config = getDynamoDBConfig();
      expect(config.endpoint).toBe("http://localhost:8000");
      expect(config.region).toBe("us-east-1");
      expect(config.accessKeyId).toBe("local");
      expect(config.secretAccessKey).toBe("local");
    });

    it("should use environment variables when set", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        DYNAMODB_ENDPOINT: "http://custom:8000",
        AWS_REGION: "eu-west-1",
        AWS_ACCESS_KEY_ID: "test-key",
        AWS_SECRET_ACCESS_KEY: "test-secret",
      };

      const config = getDynamoDBConfig();
      expect(config.endpoint).toBe("http://custom:8000");
      expect(config.region).toBe("eu-west-1");
      expect(config.accessKeyId).toBe("test-key");
      expect(config.secretAccessKey).toBe("test-secret");

      process.env = originalEnv;
    });
  });

  describe("createDynamoDBClientConfig", () => {
    it("should create client config from DynamoDBConfig", () => {
      const config = getDynamoDBConfig();
      const clientConfig = createDynamoDBClientConfig(config);
      expect(clientConfig.endpoint).toBe(config.endpoint);
      expect(clientConfig.region).toBe(config.region);
      expect(clientConfig.credentials).toEqual({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      });
    });
  });
});
