import { describe, expect, it, vi, beforeEach } from "vitest";
import { DDBRecordProcessor } from "../RecordProcessor.js";
import type { IRecordData, IRecordRepository, ILogger } from "../../types/index.js";

function createTestRecord(overrides?: Partial<IRecordData>): IRecordData {
  return {
    AccountId: "ACC123",
    RunTime: "2026-02-17T12:00:00Z",
    Processed: 0,
    DocumentId: "DOC456",
    ...overrides,
  };
}

describe("RecordProcessor", () => {
  let mockRepository: IRecordRepository & { queryUnprocessed: ReturnType<typeof vi.fn> };
  let mockMarkAsProcessed: ReturnType<typeof vi.fn>;
  let mockLogger: ILogger;
  let mockWarn: (message: string, context?: Record<string, unknown>) => void;
  let processor: DDBRecordProcessor;

  beforeEach(() => {
    const queryUnprocessedMock = vi.fn(() => Promise.resolve([]));
    mockMarkAsProcessed = vi.fn(() => Promise.resolve());
    mockWarn = vi.fn(() => undefined);
    mockRepository = {
      putItem: vi.fn(() => Promise.resolve()),
      getItem: vi.fn(() => Promise.resolve(undefined)),
      queryByAccount: vi.fn(() => Promise.resolve([])),
      queryUnprocessed: queryUnprocessedMock,
      queryProcessed: vi.fn(() => Promise.resolve([])),
      markAsProcessed: mockMarkAsProcessed,
      deleteItem: vi.fn(() => Promise.resolve()),
    } as IRecordRepository & { queryUnprocessed: ReturnType<typeof vi.fn> };
    mockLogger = {
      debug: vi.fn(() => undefined),
      info: vi.fn(() => undefined),
      warn: mockWarn,
      error: vi.fn(() => undefined),
    };
    processor = new DDBRecordProcessor({
      recordRepository: mockRepository,
      logger: mockLogger,
      config: {
        maxWorkers: 2,
        maxRetries: 1,
        backoffBaseMs: 10,
        backoffMultiplier: 1,
      },
    });
  });

  describe("constructor", () => {
    it("should create processor with default config", () => {
      const defaultProcessor = new DDBRecordProcessor({
        recordRepository: mockRepository,
        logger: mockLogger,
      });
      expect(defaultProcessor).toBeDefined();
    });

    it("should create processor with custom config", () => {
      const customProcessor = new DDBRecordProcessor({
        recordRepository: mockRepository,
        logger: mockLogger,
        config: {
          maxWorkers: 10,
          maxRetries: 5,
          backoffBaseMs: 200,
          backoffMultiplier: 3,
        },
      });
      expect(customProcessor).toBeDefined();
    });
  });

  describe("processAll", () => {
    it("should return empty errors when no records to process", async () => {
      mockRepository.queryUnprocessed.mockResolvedValue([]);

      const errors = await processor.processAll(async () => {});

      expect(errors).toEqual([]);
    });

    it("should process records successfully", async () => {
      const records = [createTestRecord(), createTestRecord({ RunTime: "2026-02-17T13:00:00Z" })];
      mockRepository.queryUnprocessed
        .mockResolvedValueOnce(records)
        .mockResolvedValueOnce([]);
      mockMarkAsProcessed.mockResolvedValue(undefined);

      const processFn = vi.fn().mockResolvedValue(undefined);
      const errors = await processor.processAll(processFn);

      expect(processFn).toHaveBeenCalledTimes(2);
      expect(mockMarkAsProcessed).toHaveBeenCalledTimes(2);
      expect(errors).toHaveLength(0);
    });

    it("should collect errors from failed processing", async () => {
      const records = [createTestRecord()];
      mockRepository.queryUnprocessed
        .mockResolvedValueOnce(records)
        .mockResolvedValueOnce([]);
      mockMarkAsProcessed.mockResolvedValue(undefined);

      const noRetryProcessor = new DDBRecordProcessor({
        recordRepository: mockRepository,
        logger: mockLogger,
        config: {
          maxWorkers: 1,
          maxRetries: 0,
          backoffBaseMs: 1,
          backoffMultiplier: 1,
          maxIterations: 1,
        },
      });

      const processFn = vi.fn().mockRejectedValue(new Error("Processing failed"));
      const errors = await noRetryProcessor.processAll(processFn);

      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe("Processing failed");
    });

    it("should stop after max iterations", async () => {
      const records = [createTestRecord()];
      mockRepository.queryUnprocessed.mockResolvedValue(records);
      mockMarkAsProcessed.mockResolvedValue(undefined);

      const limitedProcessor = new DDBRecordProcessor({
        recordRepository: mockRepository,
        logger: mockLogger,
        config: { maxWorkers: 1, maxRetries: 0, backoffBaseMs: 1, backoffMultiplier: 1, maxIterations: 2 },
      });

      const processFn = vi.fn().mockRejectedValue(new Error("Always fails"));
      await limitedProcessor.processAll(processFn);

      expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining("Max iterations"));
    });
  });

  describe("getMetrics", () => {
    it("should return initial metrics", () => {
      const metrics = processor.getMetrics();

      expect(metrics.totalProcessed).toBe(0);
      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.unprocessedErrors).toBe(0);
      expect(metrics.successRate).toBe(0);
    });

    it("should return updated metrics after processing", async () => {
      const records = [createTestRecord()];
      mockRepository.queryUnprocessed
        .mockResolvedValueOnce(records)
        .mockResolvedValueOnce([]);
      mockMarkAsProcessed.mockResolvedValue(undefined);

      await processor.processAll(async () => {});
      const metrics = processor.getMetrics();

      expect(metrics.totalProcessed).toBe(1);
    });
  });

  describe("isRetryableError", () => {
    it("should return false for non-Error objects", () => {
      expect(processor.isRetryableError("string")).toBe(false);
      expect(processor.isRetryableError(null)).toBe(false);
      expect(processor.isRetryableError(undefined)).toBe(false);
    });

    it("should return false for validation errors", () => {
      expect(processor.isRetryableError(new Error("validation failed"))).toBe(false);
    });

    it("should return false for unauthorized errors", () => {
      expect(processor.isRetryableError(new Error("unauthorized access"))).toBe(false);
    });

    it("should return true for retryable errors", () => {
      expect(processor.isRetryableError(new Error("connection timeout"))).toBe(true);
      expect(processor.isRetryableError(new Error("service unavailable"))).toBe(true);
    });
  });

  describe("getErrors", () => {
    it("should return empty array initially", () => {
      expect(processor.getErrors()).toEqual([]);
    });

    it("should return collected errors after processing", async () => {
      const records = [createTestRecord()];
      mockRepository.queryUnprocessed
        .mockResolvedValueOnce(records)
        .mockResolvedValueOnce([]);

      const noRetryProcessor = new DDBRecordProcessor({
        recordRepository: mockRepository,
        logger: mockLogger,
        config: {
          maxWorkers: 1,
          maxRetries: 0,
          backoffBaseMs: 1,
          backoffMultiplier: 1,
          maxIterations: 1,
        },
      });

      const processFn = vi.fn().mockRejectedValue(new Error("Failed"));
      await noRetryProcessor.processAll(processFn);

      const errors = noRetryProcessor.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].AccountId).toBe("ACC123");
      expect(errors[0].RunTime).toBe("2026-02-17T12:00:00Z");
    });
  });
});
