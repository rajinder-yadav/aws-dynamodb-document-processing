import { z } from "zod";
import {
  DeleteCommand,
  type DocClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  createDocClient,
} from "../services/dynamodb.js";
import type { RecordData, RecordRepository as IRecordRepository } from "../types/index.js";

export const RecordSchema = z.object({
  AccountId: z.string().min(1),
  RunTime: z.string().min(1),
  Processed: z.union([z.literal(0), z.literal(1)]),
  DocumentId: z.string().min(1),
});

export const RecordWithExtrasSchema = RecordSchema.loose();

export type Record = z.infer<typeof RecordWithExtrasSchema>;

export class DynamoDBRecordRepository implements IRecordRepository {
  private readonly tableName: string;
  private readonly docClient: DocClient;

  constructor(options?: { tableName?: string; docClient?: DocClient }) {
    this.tableName = options?.tableName ?? process.env.RECORD_TABLE ?? "TSYSAdd";
    this.docClient = options?.docClient ?? createDocClient();
  }

  async putItem(record: RecordData): Promise<void> {
    const validated = RecordWithExtrasSchema.parse(record);
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: validated,
      }),
    );
  }

  async getItem(accountId: string, runTime: string): Promise<RecordData | undefined> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { AccountId: accountId, RunTime: runTime },
      }),
    );

    if (!result.Item) {
      return undefined;
    }

    return RecordWithExtrasSchema.parse(result.Item) as RecordData;
  }

  async queryByAccount(accountId: string): Promise<RecordData[]> {
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

  async queryUnprocessed(): Promise<RecordData[]> {
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

  async queryProcessed(): Promise<RecordData[]> {
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
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { AccountId: accountId, RunTime: runTime },
        UpdateExpression: "SET #Processed = :Processed",
        ExpressionAttributeNames: {
          "#Processed": "Processed",
        },
        ExpressionAttributeValues: {
          ":Processed": 1,
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

  private parseItems(items: unknown): RecordData[] {
    if (items === null || items === undefined || !Array.isArray(items)) {
      return [];
    }

    return items.map((item) => RecordWithExtrasSchema.parse(item) as RecordData);
  }
}

export const RecordRepository = DynamoDBRecordRepository;
export { type RecordData };
