export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function exponentialBackoff<T>(
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
			lastError = error;

			if (attempt === maxRetries) {
				throw error;
			}

			const delayMs = baseMs * multiplier ** attempt;
			await sleep(delayMs);
		}
	}

	throw lastError;
}
