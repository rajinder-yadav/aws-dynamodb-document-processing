import "dotenv/config";
import type { Record } from "./models/Record.js";
import { RecordRepository } from "./models/Record.js";
import { RecordProcessor } from "./services/RecordProcessor.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomUUID } from "node:crypto";

async function waitForEnter(prompt: string): Promise<void> {
  const rl = createInterface({ input, output });
  console.log(prompt);
  await rl.question("");
  rl.close();
}

async function main() {
  console.log("Record Processor Example");
  console.log("========================\n");

  const recordModel = new RecordRepository();
  const processor = new RecordProcessor({
    config: {
      maxWorkers: 3,
      maxRetries: 3,
    },
  });

  const testRecords: Record[] = [];
  const recordCount = 150;

  console.log(`1. Creating ${recordCount} test records...`);
  for (let i = 0; i < recordCount; i++) {
    const record = {
      AccountId: randomUUID(),
      RunTime: `2026-02-17T${String(i).padStart(2, "0")}:00:00Z`,
      Processed: 0 as const,
      DocumentId: `DOC${String(i).padStart(5, "0")}`,
      Amount: Math.floor(Math.random() * 1000),
    };

    await recordModel.putItem(record);
    testRecords.push(record);
    console.log(`  ✓ Created record ${i + 1}: ${record.RunTime}`);
  }

  console.log(`\n✓ ${recordCount} records have been created`);

  await waitForEnter("Press Enter to continue...");

  console.log("\n3. Processing records...");

  async function processRecord(record: Record) {
    console.log(`  Processing: AccountId=${record.AccountId}, RunTime=${record.RunTime}`);

    if (Math.random() < 0.2) {
      throw new Error("Random processing error (DynamoDB timeout simulation)");
    }

    await new Promise((resolve) => setTimeout(resolve, Math.random() * 500));
  }

  const errors = await processor.processAll(processRecord);

  console.log("\n✓ Records have been processed");

  const metrics = processor.getMetrics();
  console.log(`\n   Metrics:`);
  console.log(`     Processed Records: ${metrics.totalProcessed}`);
  console.log(`     Unprocessed Errors: ${metrics.unprocessedErrors}`);
  console.log(`     Attempts: ${metrics.totalAttempts}`);
  console.log(`     Success Rate: ${metrics.successRate}%`);

  if (errors.length > 0) {
    console.log("\nFailed records:");
    errors.forEach((error, index) => {
      console.log(
        `  ${index + 1}. AccountId=${error.AccountId}, RunTime=${error.RunTime}, Error: ${error.error}`,
      );
    });
  }

  await waitForEnter("\nPress Enter to continue...");

  console.log("\n5. Deleting all records in parallel...");

  await Promise.all(
    testRecords.map((record) => recordModel.deleteItem(record.AccountId, record.RunTime)),
  );
  console.log("✓ All records have been deleted");

  console.log("\n✅ Example completed!");
}

void main();
