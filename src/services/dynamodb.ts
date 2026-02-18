import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  createDynamoDBClientConfig,
  getDynamoDBConfig,
} from "../utils/config.js";

export type DocClient = DynamoDBDocumentClient;

export function createDocClient(config?: {
  endpoint?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}): DocClient {
  const dbConfig = getDynamoDBConfig();
  const clientConfig = createDynamoDBClientConfig({
    endpoint: config?.endpoint ?? dbConfig.endpoint,
    region: config?.region ?? dbConfig.region,
    accessKeyId: config?.accessKeyId ?? dbConfig.accessKeyId,
    secretAccessKey: config?.secretAccessKey ?? dbConfig.secretAccessKey,
  });

  const client = new DynamoDBClient(clientConfig);
  return DynamoDBDocumentClient.from(client);
}

export const docClient = createDocClient();

export { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand };
