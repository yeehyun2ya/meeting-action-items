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
import { parseCreateMeetingBody } from "./meetingInput";
import { prisma } from "./prisma";

if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

const port = process.env.PORT ?? "4000";

const app = express();

app.use(express.json());

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

const logUnexpectedError = (error: unknown): void => {
  if (error instanceof Error) {
    console.error(error);
    return;
  }

  console.error("Unexpected non-error thrown", error);
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

app.post("/meetings", async (request, response) => {
  const parseResult = parseCreateMeetingBody(request.body);

  if (!parseResult.ok) {
    response.status(400).json({ error: parseResult.message });
    return;
  }

  try {
    const meeting = await prisma.meeting.create({
      data: {
        title: parseResult.value.title,
        minutes: parseResult.value.minutes,
        actionItems: {
          create: parseResult.value.actionItems.map((actionItem) => ({
            content: actionItem.content,
            assignee: actionItem.assignee,
            dueDate: actionItem.dueDate,
          })),
        },
      },
      include: {
        actionItems: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    response.status(201).json(meeting);
  } catch (error) {
    logUnexpectedError(error);
    response.status(500).json({ error: "Failed to create meeting" });
  }
});

app.get("/meetings", async (_request, response) => {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            actionItems: true,
          },
        },
        actionItems: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            content: true,
          },
          take: 2,
        },
      },
    });

    const meetingSummaries = meetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
      actionItemCount: meeting._count.actionItems,
      actionItemPreview: meeting.actionItems,
    }));

    response.json(meetingSummaries);
  } catch (error) {
    logUnexpectedError(error);
    response.status(500).json({ error: "Failed to list meetings" });
  }
});

app.get("/meetings/:id", async (request, response) => {
  const meetingId = request.params.id.trim();

  if (meetingId.length === 0) {
    response.status(400).json({ error: "Meeting id is required" });
    return;
  }

  try {
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
      include: {
        actionItems: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (meeting === null) {
      response.status(404).json({ error: "Meeting not found" });
      return;
    }

    response.json(meeting);
  } catch (error) {
    logUnexpectedError(error);
    response.status(500).json({ error: "Failed to get meeting" });
  }
});

app.use(handleRequestError);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
