export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface RecordData {
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

export interface RecordRepository {
  putItem(record: RecordData): Promise<void>;
  getItem(accountId: string, runTime: string): Promise<RecordData | undefined>;
  queryByAccount(accountId: string): Promise<RecordData[]>;
  queryUnprocessed(): Promise<RecordData[]>;
  queryProcessed(): Promise<RecordData[]>;
  markAsProcessed(accountId: string, runTime: string): Promise<void>;
  deleteItem(accountId: string, runTime: string): Promise<void>;
}
