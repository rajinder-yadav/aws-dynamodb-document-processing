import {
  DeleteCommand,
  docClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "../services/dynamodb.js";

export interface Record {
  AccountId: string;
  RunTime: string;
  Processed: 0 | 1;
  DocumentId: string;
  [key: string]: unknown;
}

export class RecordRepository {
  private tableName: string;

  constructor(tableName: string = process.env.RECORD_TABLE ?? "TSYSAdd") {
    this.tableName = tableName;
  }

  async putItem(record: Record): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: record,
      }),
    );
  }

  async getItem(AccountId: string, RunTime: string): Promise<Record | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { AccountId, RunTime },
      }),
    );

    return result.Item as Record;
  }

  async queryByAccount(AccountId: string): Promise<Record[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "AccountId = :AccountId",
        ExpressionAttributeValues: {
          ":AccountId": AccountId,
        },
      }),
    );

    return (result.Items || []) as Record[];
  }

  async queryUnprocessed(): Promise<Record[]> {
    const result = await docClient.send(
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

    return (result.Items || []) as Record[];
  }

  async queryProcessed(): Promise<Record[]> {
    const result = await docClient.send(
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

    return (result.Items || []) as Record[];
  }

  async markAsProcessed(AccountId: string, RunTime: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { AccountId, RunTime },
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

  async deleteItem(AccountId: string, RunTime: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { AccountId, RunTime },
      }),
    );
  }
}
