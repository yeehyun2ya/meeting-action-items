import cors from "cors";
import dotenv from "dotenv";
import express, { type ErrorRequestHandler, type Response } from "express";
import {
  AiMeetingValidationError,
  OpenRouterConfigurationError,
  OpenRouterNetworkError,
  OpenRouterRequestError,
  OpenRouterTimeoutError,
  parseStructureMeetingRequest,
  structureMeetingMinutes,
} from "./aiMeeting";
import { sendError, type ApiErrorBody } from "./errors/apiError";
import { meetingRouter } from "./meetingRoutes";
import { mutationRouter } from "./routes/mutationRoutes";
import { logUnexpectedError } from "./requestLogging";

if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

const port = process.env.PORT ?? "4000";

const app = express();

app.use(express.json());
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));

type AiServiceErrorOptions = ApiErrorBody & {
  readonly status: number;
};

const sendAiServiceError = (response: Response, options: AiServiceErrorOptions): void => {
  sendError(response, options.status, {
    code: options.code,
    message: options.message,
    retryable: options.retryable,
  });
};

const isJsonParseError = (error: unknown): boolean => {
  if (!(error instanceof SyntaxError)) {
    return false;
  }

  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }

  return error.status === 400;
};

const handleRequestError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (isJsonParseError(error)) {
    sendError(response, 400, {
      code: "INVALID_JSON",
      message: "요청 본문이 올바른 JSON이 아닙니다",
      retryable: false,
    });
    return;
  }

  logUnexpectedError(error);
  sendError(response, 500, {
    code: "INTERNAL_ERROR",
    message: "예기치 못한 오류가 발생했습니다",
    retryable: false,
  });
};

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/ai/structure-meeting", async (request, response) => {
  const parseResult = parseStructureMeetingRequest(request.body);

  if (!parseResult.ok) {
    sendError(response, 400, {
      code: "VALIDATION_ERROR",
      message: parseResult.message,
      retryable: false,
    });
    return;
  }

  try {
    const meetingDraft = await structureMeetingMinutes(parseResult.minutes);

    response.json(meetingDraft);
  } catch (error) {
    if (error instanceof OpenRouterConfigurationError) {
      sendAiServiceError(response, {
        status: 500,
        code: "OPENROUTER_CONFIGURATION",
        message: error.message,
        retryable: false,
      });
      return;
    }

    if (error instanceof OpenRouterTimeoutError) {
      sendAiServiceError(response, {
        status: 504,
        code: "OPENROUTER_TIMEOUT",
        message: error.message,
        retryable: error.retryable,
      });
      return;
    }

    if (error instanceof OpenRouterNetworkError) {
      sendAiServiceError(response, {
        status: 502,
        code: "OPENROUTER_NETWORK",
        message: error.message,
        retryable: error.retryable,
      });
      return;
    }

    if (error instanceof AiMeetingValidationError) {
      sendAiServiceError(response, {
        status: 502,
        code: "AI_RESPONSE_INVALID",
        message: "AI response could not be structured",
        retryable: error.retryable,
      });
      return;
    }

    if (error instanceof OpenRouterRequestError) {
      sendAiServiceError(response, {
        status: 502,
        code: "OPENROUTER_REQUEST_FAILED",
        message: "OpenRouter request failed",
        retryable: error.retryable,
      });
      return;
    }

    logUnexpectedError(error);
    sendError(response, 500, {
      code: "INTERNAL_ERROR",
      message: "Failed to structure meeting minutes",
      retryable: false,
    });
  }
});

app.use("/meetings", meetingRouter);
app.use(mutationRouter);

app.use(handleRequestError);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
