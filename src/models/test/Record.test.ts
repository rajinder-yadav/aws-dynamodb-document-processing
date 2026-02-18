import { describe, expect, it, vi, beforeEach } from "vitest";
import { DynamoDBRecordRepository, RecordSchema, RecordWithExtrasSchema } from "../Record.js";
import type { DocClient } from "../../services/dynamodb.js";
import type { RecordData } from "../../types/index.js";

describe("RecordSchema", () => {
  it("should validate a valid record", () => {
    const validRecord = {
      AccountId: "ACC123",
      RunTime: "2026-02-17T12:00:00Z",
      Processed: 0 as const,
      DocumentId: "DOC456",
    };
    expect(() => RecordSchema.parse(validRecord)).not.toThrow();
  });

  it("should reject record with empty AccountId", () => {
    const invalidRecord = {
      AccountId: "",
      RunTime: "2026-02-17T12:00:00Z",
      Processed: 0,
      DocumentId: "DOC456",
    };
    expect(() => RecordSchema.parse(invalidRecord)).toThrow();
  });

  it("should reject record with invalid Processed value", () => {
    const invalidRecord = {
      AccountId: "ACC123",
      RunTime: "2026-02-17T12:00:00Z",
      Processed: 2,
      DocumentId: "DOC456",
    };
    expect(() => RecordSchema.parse(invalidRecord)).toThrow();
  });
});

describe("RecordWithExtrasSchema", () => {
  it("should validate record with extra fields", () => {
    const recordWithExtras = {
      AccountId: "ACC123",
      RunTime: "2026-02-17T12:00:00Z",
      Processed: 0 as const,
      DocumentId: "DOC456",
      Amount: 100,
      CustomField: "value",
    };
    expect(() => RecordWithExtrasSchema.parse(recordWithExtras)).not.toThrow();
  });
});

describe("DynamoRecordRepository", () => {
  let mockDocClient: { send: ReturnType<typeof vi.fn> };
  let repository: DynamoDBRecordRepository;

  beforeEach(() => {
    mockDocClient = { send: vi.fn() };
    repository = new DynamoDBRecordRepository({
      tableName: "TestTable",
      docClient: mockDocClient as unknown as DocClient,
    });
  });

  describe("putItem", () => {
    it("should put item to DynamoDB", async () => {
      const record: RecordData = {
        AccountId: "ACC123",
        RunTime: "2026-02-17T12:00:00Z",
        Processed: 0,
        DocumentId: "DOC456",
      };
      mockDocClient.send.mockResolvedValue({});

      await repository.putItem(record);

      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it("should reject invalid record", async () => {
      const invalidRecord = {
        AccountId: "",
        RunTime: "2026-02-17T12:00:00Z",
        Processed: 0,
        DocumentId: "DOC456",
      } as RecordData;

      await expect(repository.putItem(invalidRecord)).rejects.toThrow();
    });
  });

  describe("getItem", () => {
    it("should return item when found", async () => {
      const mockItem = {
        AccountId: "ACC123",
        RunTime: "2026-02-17T12:00:00Z",
        Processed: 0,
        DocumentId: "DOC456",
      };
      mockDocClient.send.mockResolvedValue({ Item: mockItem });

      const result = await repository.getItem("ACC123", "2026-02-17T12:00:00Z");

      expect(result).toEqual(mockItem);
    });

    it("should return undefined when item not found", async () => {
      mockDocClient.send.mockResolvedValue({});

      const result = await repository.getItem("ACC123", "2026-02-17T12:00:00Z");

      expect(result).toBeUndefined();
    });
  });

  describe("queryByAccount", () => {
    it("should return records for account", async () => {
      const mockItems = [
        { AccountId: "ACC123", RunTime: "2026-02-17T12:00:00Z", Processed: 0, DocumentId: "DOC1" },
        { AccountId: "ACC123", RunTime: "2026-02-17T13:00:00Z", Processed: 0, DocumentId: "DOC2" },
      ];
      mockDocClient.send.mockResolvedValue({ Items: mockItems });

      const result = await repository.queryByAccount("ACC123");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no items", async () => {
      mockDocClient.send.mockResolvedValue({ Items: [] });

      const result = await repository.queryByAccount("ACC123");

      expect(result).toEqual([]);
    });
  });

  describe("queryUnprocessed", () => {
    it("should return unprocessed records", async () => {
      const mockItems = [
        { AccountId: "ACC123", RunTime: "2026-02-17T12:00:00Z", Processed: 0, DocumentId: "DOC1" },
      ];
      mockDocClient.send.mockResolvedValue({ Items: mockItems });

      const result = await repository.queryUnprocessed();

      expect(result).toHaveLength(1);
      expect(result[0].Processed).toBe(0);
    });
  });

  describe("queryProcessed", () => {
    it("should return processed records", async () => {
      const mockItems = [
        { AccountId: "ACC123", RunTime: "2026-02-17T12:00:00Z", Processed: 1, DocumentId: "DOC1" },
      ];
      mockDocClient.send.mockResolvedValue({ Items: mockItems });

      const result = await repository.queryProcessed();

      expect(result).toHaveLength(1);
      expect(result[0].Processed).toBe(1);
    });
  });

  describe("markAsProcessed", () => {
    it("should update record to processed", async () => {
      mockDocClient.send.mockResolvedValue({});

      await repository.markAsProcessed("ACC123", "2026-02-17T12:00:00Z");

      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteItem", () => {
    it("should delete record", async () => {
      mockDocClient.send.mockResolvedValue({});

      await repository.deleteItem("ACC123", "2026-02-17T12:00:00Z");

      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });
  });
});
