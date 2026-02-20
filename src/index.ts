export { DynamoDBRecordRepository, RecordRepository } from "./models/Record.js";
export { DDBRecordProcessor, type ProcessFunction } from "./services/RecordProcessor.js";
export { createLogger, Logger } from "./services/logger.js";
export { createDocClient, docClient } from "./services/dynamodb.js";
export { getDynamoDBConfig, createDynamoDBClientConfig, type DynamoDBConfig } from "./utils/config.js";
export { getDefaultConfig, type ProcessorConfig, type ProcessError } from "./utils/processor-config.js";
export type { IRecordData, IRecordRepository, ILogger, LogLevel, ILogEntry, ProcessorMetrics } from "./types/index.js";
