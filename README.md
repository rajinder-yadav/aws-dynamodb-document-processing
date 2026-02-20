# DynamoDB Local TypeScript Project

TypeScript project for working with DynamoDB locally using AWS SDK v3.

Shows how to process unprocessed DynamoDB table documents. Uses Worker to do the processing and isolates error with exponential backoff retry.

You can configure the following properties:

```ts
export interface ProcessorConfig {
  maxWorkers: number;         \\ Default 3
  maxRetries: number;         \\ Default 5
  backoffBaseMs: number;      \\ Default 100
  backoffMultiplier: number;  \\ Default 2
  maxIterations: number;      \\ Default 10
}
```


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

This creates the TSYSAdd table with:
- **Partition Key**: AccountId
- **Sort Key**: RunTime
- **Global Secondary Index (GSI)**: Processed for tracking document processing status

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
pnpm tsc
```

### Run tests

```bash
pnpm test
```

### Run tests with coverage

```bash
pnpm test:coverage
```

## Record Model

The `DynamoRecordRepository` handles a table with:

- **Partition Key**: AccountId
- **Sort Key**: RunTime
- **Global Secondary Index (GSI)**: Processed
  - `Processed` values: `0` (unprocessed) or `1` (processed)

### Example usage

```typescript
import { DynamoRecordRepository } from "./models/Record.js";

const recordRepository = new DynamoRecordRepository();

// Insert unprocessed record
await recordRepository.putItem({
  AccountId: "ACC12345",
  RunTime: "2026-02-17T12:00:00Z",
  Processed: 0,
  DocumentId: "DOC67890",
});

// Query unprocessed records via GSI
const unprocessed = await recordRepository.queryUnprocessed();

// Mark as processed
await recordRepository.markAsProcessed("ACC12345", "2026-02-17T12:00:00Z");

// Query processed records via GSI
const processed = await recordRepository.queryProcessed();

// Query by account
const accountRecords = await recordRepository.queryByAccount("ACC12345");
```

## RecordProcessor

The `RecordProcessor` processes all unprocessed records in parallel with configurable workers.

### Features

- **Parallel Processing**: Process multiple records concurrently using workers
- **Error Isolation**: Individual record failures don't stop processing
- **Exponential Back-off**: Automatic retries for DynamoDB errors
- **Configurable Settings**: Adjust workers, retries, and back-off timing
- **Error Tracking**: Collects all errors for later processing
- **Dependency Injection**: Fully testable with injected dependencies

### Example usage

```typescript
import { RecordProcessor } from "./services/RecordProcessor.js";
import { DynamoRecordRepository } from "./models/Record.js";
import { createLogger } from "./services/Logger.js";
import type { RecordData } from "./types/index.js";

const processor = new RecordProcessor({
  recordRepository: new DynamoRecordRepository(),
  logger: createLogger("RecordProcessor"),
  config: {
    maxWorkers: 5,
    maxRetries: 3,
    backoffBaseMs: 100,
    backoffMultiplier: 2,
  },
});

async function processRecord(record: RecordData): Promise<void> {
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
- `maxIterations`: Maximum processing iterations to prevent infinite loops (default: 10)

## Project Structure

```
src/
├── services/               # Services
│   ├── dynamodb.ts        # DynamoDB client setup
│   ├── Logger.ts          # Logging service
│   └── RecordProcessor.ts # Parallel record processor
├── models/                 # Data models
│   └── Record.ts          # Record model with Zod validation
├── types/                  # Type definitions
│   └── index.ts           # Interfaces and types
├── utils/                  # Utility functions
│   ├── config.ts          # Configuration utilities
│   └── processor-config.ts # Processor configuration
├── index.ts                # Main entry point / exports
├── record-example.ts       # Record model example
├── processor-example.ts    # Processor example
└── processor-complete-example.ts  # Complete processor example with test data
scripts/                    # Utility scripts
└── create-tables.ts        # Create DynamoDB tables
```

## Technology Stack

- TypeScript (strict mode)
- AWS SDK v3 (@aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb)
- Zod (schema validation)
- Vitest (testing)
- tsx (development runner)
- oxlint (linting)
- oxfmt (formatting)

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design and diagrams.
