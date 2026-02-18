import "dotenv/config";
import { RecordRepository } from "./models/Record.js";

async function main() {
  console.log("DynamoDB Record Model Example");
  console.log("================================\n");

  const recordModel = new RecordRepository();

  const accountId = "ACC12345";
  const runTime = "2026-02-17T12:00:00Z";

  try {
    const record = {
      AccountId: accountId,
      RunTime: runTime,
      Processed: 0 as const,
      DocumentId: "DOC67890",
      Amount: 150.5,
    };

    console.log("1. Creating unprocessed record...");
    await recordModel.putItem(record);
    console.log("✓ Record created");

    console.log("\n2. Querying unprocessed records...");
    const unprocessed = await recordModel.queryUnprocessed();
    console.log(`✓ Found ${unprocessed.length} unprocessed record(s)`);

    console.log("\n3. Getting record by AccountId and RunTime...");
    const retrievedRecord = await recordModel.getItem(accountId, runTime);
    console.log("✓ Record retrieved:", retrievedRecord);

    console.log("\n4. Marking record as processed...");
    await recordModel.markAsProcessed(accountId, runTime);
    console.log("✓ Record marked as processed");

    console.log("\n5. Querying processed records...");
    const processed = await recordModel.queryProcessed();
    console.log(`✓ Found ${processed.length} processed record(s)`);

    console.log("\n6. Querying records by AccountId...");
    const accountRecords = await recordModel.queryByAccount(accountId);
    console.log(`✓ Found ${accountRecords.length} record(s) for account ${accountId}`);

    console.log("\n7. Deleting record...");
    await recordModel.deleteItem(accountId, runTime);
    console.log("✓ Record deleted");

    console.log("\n✅ All operations completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

void main();
