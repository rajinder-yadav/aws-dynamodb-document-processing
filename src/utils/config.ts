import type { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";

export interface DynamoDBConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const DEFAULT_ENDPOINT = "http://localhost:8000";
const DEFAULT_REGION = "us-east-1";
const DEFAULT_ACCESS_KEY_ID = "local";
const DEFAULT_SECRET_ACCESS_KEY = "local";

export function getDynamoDBConfig(): DynamoDBConfig {
  return {
    endpoint: process.env.DYNAMODB_ENDPOINT ?? DEFAULT_ENDPOINT,
    region: process.env.AWS_REGION ?? DEFAULT_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? DEFAULT_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? DEFAULT_SECRET_ACCESS_KEY,
  };
}

export function createDynamoDBClientConfig(config: DynamoDBConfig): DynamoDBClientConfig {
  return {
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };
}
