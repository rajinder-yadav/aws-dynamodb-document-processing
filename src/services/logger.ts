import pino from "pino";
import type { ILogger } from "../types/index.js";

export class Logger implements ILogger {
  private readonly logger: pino.Logger;

  constructor(context: string) {
    this.logger = pino({
      level: "debug",
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    }).child({ name: context });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(context ?? {}, message);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(context ?? {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context ?? {}, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(context ?? {}, message);
  }
}

export function createLogger(context: string): ILogger {
  return new Logger(context);
}
