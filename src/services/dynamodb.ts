import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	QueryCommand,
	UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { getDynamoDBConfig } from "../utils/config.js";

const config = getDynamoDBConfig();

const client = new DynamoDBClient({
	endpoint: config.endpoint,
	// region: config.region,
	// credentials: {
	//   accessKeyId: config.accessKeyId,
	//   secretAccessKey: config.secretAccessKey,
	// },
});

export const docClient = DynamoDBDocumentClient.from(client);

export { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand };
