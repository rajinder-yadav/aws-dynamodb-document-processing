import "dotenv/config";
import { type Record, RecordRepository } from "./models/Record.js";
import { RecordProcessor } from "./services/RecordProcessor.js";

async function main() {
  console.log("Record Processor Complete Example");
  console.log("=================================\n");

  const recordModel = new RecordRepository();

  const testRecords: Record[] = [];

  console.log("1. Creating test records...");
  for (let i = 0; i < 50; i++) {
    const record = {
      AccountId: "ACC12345",
      RunTime: `2026-02-17T${String(i).padStart(2, "0")}:00:00Z`,
      Processed: 0 as const,
      DocumentId: `DOC${String(i).padStart(5, "0")}`,
      Amount: Math.floor(Math.random() * 1000),
    };

    await recordModel.putItem(record);
    testRecords.push(record);
    console.log(`  ✓ Created record ${i + 1}: ${record.RunTime}`);
  }

  console.log("\n2. Processing records with 3 workers...");
  const processor = new RecordProcessor({
    config: {
      maxWorkers: 3,
      maxRetries: 3,
    },
  });

  async function processRecord(record: Record): Promise<void> {
    console.log(
      `  Processing: AccountId=${record.AccountId}, RunTime=${record.RunTime}, DocumentId=${record.DocumentId}`,
    );

    if (Math.random() < 0.2) {
      throw new Error("Random processing error");
    }

    await new Promise((resolve) => setTimeout(resolve, Math.random() * 500));
  }

  const errors = await processor.processAll(processRecord);

  console.log(`\n3. Processing complete.`);
  console.log(`   - Total records: ${testRecords.length}`);
  console.log(`   - Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\n4. Failed records:");
    errors.forEach((error, index) => {
      console.log(
        `   ${index + 1}. AccountId=${error.AccountId}, RunTime=${error.RunTime}, Error: ${error.error}`,
      );
    });
  }

  console.log("\n5. Querying remaining unprocessed records...");
  const remaining = await recordModel.queryUnprocessed();
  console.log(`   Remaining unprocessed: ${remaining.length}`);

  console.log("\n6. Cleaning up test records in parallel...");
  await Promise.all(
    testRecords.map((record) => recordModel.deleteItem(record.AccountId, record.RunTime)),
  );
  console.log("   ✓ Cleanup complete");

  console.log("\n✅ Example completed!");
}

void main();
