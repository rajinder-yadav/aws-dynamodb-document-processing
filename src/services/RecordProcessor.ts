import { type Record, RecordRepository } from "../models/Record.js";
import type {
	ProcessError,
	ProcessorConfig,
} from "../utils/processor-config.js";
import { getDefaultConfig } from "../utils/processor-config.js";
import { exponentialBackoff } from "../utils/retry.js";

export type ProcessFunction = (record: Record) => Promise<void>;

export class RecordProcessor {
	private recordModel: RecordRepository;
	private config: ProcessorConfig;
	private errors: ProcessError[];

	constructor(config?: Partial<ProcessorConfig>) {
		this.recordModel = new RecordRepository();
		this.config = { ...getDefaultConfig(), ...config };
		this.errors = [];
	}

	async processAll(processFn: ProcessFunction): Promise<ProcessError[]> {
		this.errors = [];
		let recordsToRetry: Record[] = [];

		while (true) {
			const unprocessedRecords =
				recordsToRetry.length > 0
					? recordsToRetry
					: await this.fetchUnprocessedRecords();

			if (unprocessedRecords.length === 0) {
				break;
			}

			recordsToRetry = await this.processBatch(unprocessedRecords, processFn);
		}

		return this.errors;
	}

	private async fetchUnprocessedRecords(): Promise<Record[]> {
		return await exponentialBackoff(
			() => this.recordModel.queryUnprocessed(),
			this.config.maxRetries,
			this.config.backoffBaseMs,
			this.config.backoffMultiplier,
		);
	}

	private async processBatch(
		records: Record[],
		processFn: ProcessFunction,
	): Promise<Record[]> {
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

	private async processRecord(
		record: Record,
		processFn: ProcessFunction,
	): Promise<void> {
		await exponentialBackoff(
			() => processFn(record),
			this.config.maxRetries,
			this.config.backoffBaseMs,
			this.config.backoffMultiplier,
		);
		await this.markAsProcessed(record);
	}

	private async markAsProcessed(record: Record): Promise<void> {
		await exponentialBackoff(
			() => this.recordModel.markAsProcessed(record.AccountId, record.RunTime),
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
}
