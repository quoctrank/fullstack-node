import winston from "winston";
export declare const logger: winston.Logger;
/** Returns a child logger bound to a specific correlationId */
export declare function childLogger(correlationId: string): winston.Logger;
//# sourceMappingURL=logger.d.ts.map