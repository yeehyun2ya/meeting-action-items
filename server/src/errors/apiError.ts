import type { Response } from "express";

export type ApiErrorBody = {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
};

export const sendError = (res: Response, status: number, body: ApiErrorBody): void => {
  res.status(status).json(body);
};
