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
import { meetingRouter } from "./meetingRoutes";
import { mutationRouter } from "./routes/mutationRoutes";
import { logUnexpectedError } from "./requestLogging";

if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

const port = process.env.PORT ?? "4000";

const app = express();

app.use(express.json());
app.use(cors());

type AiServiceErrorOptions = {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
};

const sendAiServiceError = (response: Response, options: AiServiceErrorOptions): void => {
  response.status(options.status).json({
    error: {
      code: options.code,
      message: options.message,
      retryable: options.retryable,
    },
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
    response.status(400).json({ error: "Request body must be valid JSON" });
    return;
  }

  logUnexpectedError(error);
  response.status(500).json({ error: "Unexpected request error" });
};

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/ai/structure-meeting", async (request, response) => {
  const parseResult = parseStructureMeetingRequest(request.body);

  if (!parseResult.ok) {
    response.status(400).json({ error: parseResult.message });
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
    response.status(500).json({ error: "Failed to structure meeting minutes" });
  }
});

app.use("/meetings", meetingRouter);
app.use(mutationRouter);

app.use(handleRequestError);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
