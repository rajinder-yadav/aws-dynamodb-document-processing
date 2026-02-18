export { DynamoDBRecordRepository as DynamoRecordRepository, RecordRepository } from "./models/Record.js";
export { RecordProcessor, type ProcessFunction } from "./services/RecordProcessor.js";
export { ConsoleLogger, createLogger } from "./services/Logger.js";
export { createDocClient, docClient } from "./services/dynamodb.js";
export { getDynamoDBConfig, createDynamoDBClientConfig, type DynamoDBConfig } from "./utils/config.js";
export { getDefaultConfig, type ProcessorConfig, type ProcessError } from "./utils/processor-config.js";
export type { RecordData, RecordRepository as IRecordRepository, Logger, LogLevel, LogEntry, ProcessorMetrics } from "./types/index.js";
