import { CreateTableCommand, DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getDynamoDBConfig } from "../src/utils/config.js";

const config = getDynamoDBConfig();

const client = new DynamoDBClient({
  endpoint: config.endpoint,
  // region: config.region,
  // credentials: {
  //   accessKeyId: config.accessKeyId,
  //   secretAccessKey: config.secretAccessKey,
  // },
});

interface AttributeDefinition {
  AttributeName: string;
  AttributeType: "S" | "N" | "B";
}

interface KeySchemaElement {
  AttributeName: string;
  KeyType: "HASH" | "RANGE";
}

interface GlobalSecondaryIndex {
  IndexName: string;
  KeySchema: KeySchemaElement[];
  Projection: {
    ProjectionType: "ALL" | "KEYS_ONLY" | "INCLUDE";
    NonKeyAttributes?: string[];
  };
}

interface TableDefinition {
  name: string;
  attributes: AttributeDefinition[];
  keySchema: KeySchemaElement[];
  globalSecondaryIndexes?: GlobalSecondaryIndex[];
}

const tables: TableDefinition[] = [
  {
    name: "TSYSAdd",
    attributes: [
      { AttributeName: "AccountId", AttributeType: "S" },
      { AttributeName: "RunTime", AttributeType: "S" },
      { AttributeName: "Processed", AttributeType: "N" },
    ],
    keySchema: [
      { AttributeName: "AccountId", KeyType: "HASH" },
      { AttributeName: "RunTime", KeyType: "RANGE" },
    ],
    globalSecondaryIndexes: [
      {
        IndexName: "Processed",
        KeySchema: [{ AttributeName: "Processed", KeyType: "HASH" }],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  },
];

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch {
    return false;
  }
}

async function createTables() {
  console.log("Creating DynamoDB tables...");

  for (const table of tables) {
    const exists = await tableExists(table.name);

    if (exists) {
      console.log(`✓ Table '${table.name}' already exists`);
      continue;
    }

    try {
      const command = new CreateTableCommand({
        TableName: table.name,
        AttributeDefinitions: table.attributes,
        KeySchema: table.keySchema,
        GlobalSecondaryIndexes: table.globalSecondaryIndexes,
        BillingMode: "PAY_PER_REQUEST",
      });

      await client.send(command);
      console.log(`✓ Table '${table.name}' created successfully`);
    } catch (error) {
      console.error(`✗ Failed to create table '${table.name}':`, error);
    }
  }

  console.log("\nTable creation complete");
}

void createTables();
