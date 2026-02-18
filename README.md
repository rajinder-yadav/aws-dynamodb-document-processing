# DynamoDB Local TypeScript Project

TypeScript project for working with DynamoDB locally using AWS SDK v3.

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start DynamoDB Local

#### Option A: Using Docker

```bash
docker run -d -p 8000:8000 amazon/dynamodb-local:latest
```

#### Option B: Using DynamoDB Local JAR

Download from [AWS DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) and run:

```bash
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -port 8000
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` if you need to customize settings (default values work for local DynamoDB).

### 4. Create tables

```bash
pnpm create-tables
```

This creates two tables:

- **Users**: With pk/sk primary keys
- **Records**: With AccountId/RunTime primary keys and a "Processed" GSI for tracking document processing status

## Usage

### Run the Record model example

```bash
pnpm record-example
```

### Run the Record processor example

```bash
pnpm processor-example
```

### Run the complete Record processor example (with test data)

```bash
pnpm processor-complete-example
```

### Build the project

```bash
pnpm build
```

### Type check

```bash
pnpm check
```

## Record Model

The `RecordModel` handles a table with:

- **Partition Key**: AccountId
- **Sort Key**: RunTime
- **Global Secondary Index (GSI)**: Processed
  - `Processed` values: `0` (unprocessed) or `1` (processed)

### Example usage

```typescript
import { RecordModel } from "./models/Record.js";

const recordModel = new RecordModel();

// Insert unprocessed record
await recordModel.putItem({
  AccountId: "ACC12345",
  RunTime: "2026-02-17T12:00:00Z",
  Processed: 0,
  DocumentId: "DOC67890",
});

// Query unprocessed records via GSI
const unprocessed = await recordModel.queryUnprocessed();

// Mark as processed
await recordModel.markAsProcessed("ACC12345", "2026-02-17T12:00:00Z");

// Query processed records via GSI
const processed = await recordModel.queryProcessed();

// Query by account
const accountRecords = await recordModel.queryByAccount("ACC12345");
```

## RecordProcessor

The `RecordProcessor` processes all unprocessed records in parallel with configurable workers.

### Features

- **Parallel Processing**: Process multiple records concurrently using workers
- **Error Isolation**: Individual record failures don't stop processing
- **Exponential Back-off**: Automatic retries for DynamoDB errors
- **Configurable Settings**: Adjust workers, retries, and back-off timing
- **Error Tracking**: Collects all errors for later processing

### Example usage

```typescript
import { RecordProcessor } from "./services/RecordProcessor.js";
import type { Record } from "./models/Record.js";

const processor = new RecordProcessor({
  maxWorkers: 5,
  maxRetries: 3,
  backoffBaseMs: 100,
  backoffMultiplier: 2,
});

async function processRecord(record: Record): Promise<void> {
  console.log(`Processing: ${record.AccountId} - ${record.RunTime}`);
}

const errors = await processor.processAll(processRecord);

console.log(`Processing complete. Errors: ${errors.length}`);
errors.forEach((error) => {
  console.log(`Failed: ${error.AccountId} - ${error.RunTime}`);
});
```

### Configuration Options

- `maxWorkers`: Number of parallel workers (default: 5)
- `maxRetries`: Maximum retry attempts for DynamoDB errors (default: 3)
- `backoffBaseMs`: Base delay for exponential back-off in ms (default: 100)
- `backoffMultiplier`: Multiplier for exponential back-off (default: 2)

## Project Structure

```
src/
├── services/               # DynamoDB client and services
│   ├── dynamodb.ts        # DynamoDB client setup
│   └── RecordProcessor.ts # Parallel record processor
├── models/                 # Data models
│   ├── User.ts           # User model
│   └── Record.ts         # Record model
├── utils/                  # Utility functions
│   ├── config.ts         # Configuration utilities
│   ├── processor-config.ts # Processor configuration
│   └── retry.ts         # Exponential back-off utilities
├── index.ts                # User model example
├── record-example.ts       # Record model example
├── processor-example.ts   # Processor example
└── processor-complete-example.ts  # Complete processor example with test data
scripts/                   # Utility scripts (create-tables)
```

## Technology Stack

- TypeScript
- AWS SDK v3 (@aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb)
- Vitest (testing)
- tsx (development runner)
