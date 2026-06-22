import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const existing = req.headers["x-correlation-id"];
  req.correlationId =
    (Array.isArray(existing) ? existing[0] : existing) ?? uuidv4();
  res.setHeader("x-correlation-id", req.correlationId);
  next();
}
