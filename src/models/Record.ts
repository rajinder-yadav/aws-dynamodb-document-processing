import {
  DeleteCommand,
  type DocClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  createDocClient,
} from "../services/dynamodb.js";
import type { IRecordData, IRecordRepository } from "../types/index.js";

export class DynamoDBRecordRepository implements IRecordRepository {
  private readonly tableName: string;
  private readonly docClient: DocClient;

  constructor(options?: { tableName?: string; docClient?: DocClient }) {
    this.tableName = options?.tableName ?? process.env.RECORD_TABLE ?? "TSYSAdd";
    this.docClient = options?.docClient ?? createDocClient();
  }

  async putItem(record: IRecordData): Promise<void> {
    const now = new Date().toISOString();
    const recordWithTimestamps = {
      ...record,
      CreatedAt: record.CreatedAt ?? now,
      UpdatedAt: now,
    };
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: recordWithTimestamps,
      }),
    );
  }

  async getItem(accountId: string, runTime: string): Promise<IRecordData | undefined> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { AccountId: accountId, RunTime: runTime },
      }),
    );

    if (!result.Item) {
      return undefined;
    }

    return result.Item as IRecordData;
  }

  async queryByAccount(accountId: string): Promise<IRecordData[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "AccountId = :AccountId",
        ExpressionAttributeValues: {
          ":AccountId": accountId,
        },
      }),
    );

    return this.parseItems(result.Items);
  }

  async queryUnprocessed(): Promise<IRecordData[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "Processed",
        KeyConditionExpression: "#Processed = :Processed",
        ExpressionAttributeNames: {
          "#Processed": "Processed",
        },
        ExpressionAttributeValues: {
          ":Processed": 0,
        },
      }),
    );

    return this.parseItems(result.Items);
  }

  async queryProcessed(): Promise<IRecordData[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "Processed",
        KeyConditionExpression: "#Processed = :Processed",
        ExpressionAttributeNames: {
          "#Processed": "Processed",
        },
        ExpressionAttributeValues: {
          ":Processed": 1,
        },
      }),
    );

    return this.parseItems(result.Items);
  }

  async markAsProcessed(accountId: string, runTime: string): Promise<void> {
    const now = new Date().toISOString();
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { AccountId: accountId, RunTime: runTime },
        UpdateExpression: "SET #Processed = :Processed, #UpdatedAt = :UpdatedAt",
        ExpressionAttributeNames: {
          "#Processed": "Processed",
          "#UpdatedAt": "UpdatedAt",
        },
        ExpressionAttributeValues: {
          ":Processed": 1,
          ":UpdatedAt": now,
        },
      }),
    );
  }

  async deleteItem(accountId: string, runTime: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { AccountId: accountId, RunTime: runTime },
      }),
    );
  }

  private parseItems(items: unknown): IRecordData[] {
    if (items === null || items === undefined || !Array.isArray(items)) {
      return [];
    }

    return items as IRecordData[];
  }
}

export const RecordRepository = DynamoDBRecordRepository;
export { type IRecordData as RecordData };
