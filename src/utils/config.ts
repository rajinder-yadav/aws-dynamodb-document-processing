export interface DynamoDBConfig {
  endpoint: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export function getDynamoDBConfig(): DynamoDBConfig {
  return {
    endpoint: process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000",
    region: process.env.AWS_REGION ?? "us-east-1",
    // accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
    // secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
  };
}
