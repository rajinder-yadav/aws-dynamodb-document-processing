import { type Record, RecordRepository } from "../models/Record.js";
import type { ProcessError, ProcessorConfig } from "../utils/processor-config.js";
import { getDefaultConfig } from "../utils/processor-config.js";

export type ProcessFunction = (record: Record) => Promise<void>;

export class RecordProcessor {
  private recordRepository: RecordRepository;
  private config: ProcessorConfig;
  private errors: ProcessError[];
  private totalProcessed: number;
  private totalAttempts: number;
  private maxIterations: number;

  constructor(config?: Partial<ProcessorConfig>) {
    this.recordRepository = new RecordRepository();
    this.config = { ...getDefaultConfig(), ...config };
    this.errors = [];
    this.totalProcessed = 0;
    this.totalAttempts = 0;
    this.maxIterations = config?.maxIterations ?? 10;
  }

  async processAll(processFn: ProcessFunction): Promise<ProcessError[]> {
    this.errors = [];
    this.totalProcessed = 0;
    this.totalAttempts = 0;
    let recordsToRetry: Record[] = [];
    let iteration = 0;

    while (true) {
      if (iteration >= this.maxIterations) {
        console.warn(
          `Max iterations (${this.maxIterations}) reached. Aborting to prevent infinite loop.`,
        );
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

  private async fetchUnprocessedRecords(): Promise<Record[]> {
    return await this.exponentialBackoffWithJitter(
      () => this.recordRepository.queryUnprocessed(),
      this.config.maxRetries,
      this.config.backoffBaseMs,
      this.config.backoffMultiplier,
    );
  }

  private async processBatch(records: Record[], processFn: ProcessFunction): Promise<Record[]> {
    const chunks = this.chunkRecords(records, this.config.maxWorkers);
    const failedRecords: Record[] = [];

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
            error: String(result.reason),
          });
          failedRecords.push(record);
        }
      });
    }

    return failedRecords;
  }

  private async processRecord(record: Record, processFn: ProcessFunction): Promise<void> {
    this.totalProcessed++;
    this.totalAttempts++;
    await this.exponentialBackoffWithJitter(
      () => processFn(record),
      this.config.maxRetries,
      this.config.backoffBaseMs,
      this.config.backoffMultiplier,
    );
    await this.markAsProcessed(record);
  }

  private async markAsProcessed(record: Record): Promise<void> {
    await this.exponentialBackoffWithJitter(
      () => this.recordRepository.markAsProcessed(record.AccountId, record.RunTime),
      this.config.maxRetries,
      this.config.backoffBaseMs,
      this.config.backoffMultiplier,
    );
  }

  private chunkRecords(records: Record[], chunkSize: number): Record[][] {
    const chunks: Record[][] = [];
    for (let i = 0; i < records.length; i += chunkSize) {
      chunks.push(records.slice(i, i + chunkSize));
    }
    return chunks;
  }

  getErrors(): ProcessError[] {
    return this.errors;
  }

  getMetrics() {
    return {
      totalProcessed: this.totalProcessed,
      totalAttempts: this.totalAttempts,
      unprocessedErrors: this.errors.length,
      totalErrorsHandled: this.totalAttempts - this.totalProcessed,
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

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
        ++this.totalAttempts;
        console.log(`✗ Processing failed:  Error: ${(error as Error).message}`);

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
