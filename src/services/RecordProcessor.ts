import type { RecordData } from "../models/Record.js";
import { RecordRepository } from "../models/Record.js";
import type { Logger, ProcessError, ProcessorMetrics, RecordRepository as IRecordRepository } from "../types/index.js";
import type { ProcessorConfig } from "../utils/processor-config.js";
import { getDefaultConfig } from "../utils/processor-config.js";
import { createLogger } from "./Logger.js";

export type ProcessFunction = (record: RecordData) => Promise<void>;

export class RecordProcessor {
  private recordRepository: IRecordRepository;
  private config: ProcessorConfig;
  private errors: ProcessError[];
  private totalProcessed: number;
  private totalAttempts: number;
  private maxIterations: number;
  private logger: Logger;

  constructor(options?: {
    config?: Partial<ProcessorConfig>;
    recordRepository?: IRecordRepository;
    logger?: Logger;
  }) {
    this.recordRepository = options?.recordRepository ?? new RecordRepository();
    this.config = { ...getDefaultConfig(), ...options?.config };
    this.errors = [];
    this.totalProcessed = 0;
    this.totalAttempts = 0;
    this.maxIterations = options?.config?.maxIterations ?? 10;
    this.logger = options?.logger ?? createLogger("RecordProcessor");
  }

  async processAll(processFn: ProcessFunction): Promise<ProcessError[]> {
    this.errors = [];
    this.totalProcessed = 0;
    this.totalAttempts = 0;
    let recordsToRetry: RecordData[] = [];
    let iteration = 0;

    while (true) {
      if (iteration >= this.maxIterations) {
        this.logger.warn(`Max iterations (${this.maxIterations}) reached. Aborting to prevent infinite loop.`);
        break;
      }

      const unprocessedRecords =
        recordsToRetry.length > 0 ? recordsToRetry : await this.fetchUnprocessedRecords();

      if (unprocessedRecords.length === 0) {
        break;
      }

      recordsToRetry = await this.processBatch(unprocessedRecords, processFn);
      iteration++;
    }

    return this.errors;
  }

  private async fetchUnprocessedRecords(): Promise<RecordData[]> {
    return await this.exponentialBackoffWithJitter(
      () => this.recordRepository.queryUnprocessed(),
      this.config.maxRetries,
      this.config.backoffBaseMs,
      this.config.backoffMultiplier,
    );
  }

  private async processBatch(records: RecordData[], processFn: ProcessFunction): Promise<RecordData[]> {
    const chunks = this.chunkRecords(records, this.config.maxWorkers);
    const failedRecords: RecordData[] = [];

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map((record) => this.processRecord(record, processFn)),
      );

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const record = chunk[index];
          this.errors.push({
            AccountId: record.AccountId,
            RunTime: record.RunTime,
            error: this.extractErrorMessage(result.reason),
          });
          failedRecords.push(record);
        }
      });
    }

    return failedRecords;
  }

  private async processRecord(record: RecordData, processFn: ProcessFunction): Promise<void> {
    await this.exponentialBackoffWithJitter(
      async () => {
        await processFn(record);
        this.totalProcessed++;
      },
      this.config.maxRetries,
      this.config.backoffBaseMs,
      this.config.backoffMultiplier,
    );
    await this.markAsProcessed(record);
  }

  private async markAsProcessed(record: RecordData): Promise<void> {
    await this.exponentialBackoffWithJitter(
      () => this.recordRepository.markAsProcessed(record.AccountId, record.RunTime),
      this.config.maxRetries,
      this.config.backoffBaseMs,
      this.config.backoffMultiplier,
    );
  }

  private chunkRecords(records: RecordData[], chunkSize: number): RecordData[][] {
    const chunks: RecordData[][] = [];
    for (let i = 0; i < records.length; i += chunkSize) {
      chunks.push(records.slice(i, i + chunkSize));
    }
    return chunks;
  }

  getErrors(): ProcessError[] {
    return this.errors;
  }

  getMetrics(): ProcessorMetrics {
    return {
      totalProcessed: this.totalProcessed,
      totalAttempts: this.totalAttempts,
      unprocessedErrors: this.errors.length,
      successRate:
        this.totalProcessed > 0
          ? ((this.totalProcessed - this.errors.length) / this.totalProcessed) * 100
          : 0,
    };
  }

  isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const errorMessage = error.message.toLowerCase();

    const nonRetryablePatterns = [
      "validation",
      "malformed",
      "invalid",
      "not found",
      "unauthorized",
      "forbidden",
      "access denied",
      "resource already exists",
      "conditional check failed",
    ];

    return !nonRetryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractErrorMessage(reason: unknown): string {
    if (reason instanceof Error) {
      return reason.message;
    }
    return String(reason);
  }

  async exponentialBackoffWithJitter<T>(
    task: () => Promise<T>,
    maxRetries: number,
    baseMs: number,
    multiplier: number,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await task();
      } catch (error) {
        this.totalAttempts++;
        const errorMessage = this.extractErrorMessage(error);
        this.logger.debug(`Processing failed: ${errorMessage}`);

        lastError = error;

        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw error;
        }

        const jitter = Math.random() * baseMs * 0.1;
        const delayMs = baseMs * multiplier ** attempt + jitter;
        await this.sleep(delayMs);
      }
    }

    throw lastError;
  }
}
