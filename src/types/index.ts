export interface ILogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface IRecordData {
  AccountId: string;
  RunTime: string;
  Processed: 0 | 1;
  DocumentId: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  [key: string]: unknown;
}

export interface ProcessError {
  AccountId: string;
  RunTime: string;
  error: string;
}

export interface ProcessorMetrics {
  totalProcessed: number;
  totalAttempts: number;
  unprocessedErrors: number;
  successRate: number;
}

export interface IRecordRepository {
  putItem(record: IRecordData): Promise<void>;
  getItem(accountId: string, runTime: string): Promise<IRecordData | undefined>;
  queryByAccount(accountId: string): Promise<IRecordData[]>;
  queryUnprocessed(): Promise<IRecordData[]>;
  queryProcessed(): Promise<IRecordData[]>;
  markAsProcessed(accountId: string, runTime: string): Promise<void>;
  deleteItem(accountId: string, runTime: string): Promise<void>;
}
