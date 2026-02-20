export interface ProcessorConfig {
  maxWorkers: number;
  maxRetries: number;
  backoffBaseMs: number;
  backoffMultiplier: number;
  maxIterations: number;
}

export interface ProcessError {
  AccountId: string;
  RunTime: string;
  error: string;
}

export function getDefaultConfig(): ProcessorConfig {
  return {
    maxWorkers: 5,
    maxRetries: 3,
    backoffBaseMs: 100,
    backoffMultiplier: 2,
    maxIterations: 10,
  };
}
