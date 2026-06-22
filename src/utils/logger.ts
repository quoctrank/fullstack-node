import winston from "winston";
import { config } from "../config";

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, correlationId, ...meta }) => {
    const cid = correlationId ? ` [${correlationId}]` : "";
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}${cid}: ${message}${extra}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: config.log.level,
  format: config.nodeEnv === "production" ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});

/** Returns a child logger bound to a specific correlationId */
export function childLogger(correlationId: string) {
  return logger.child({ correlationId });
}
