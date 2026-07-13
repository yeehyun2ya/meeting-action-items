import { z } from "zod";

const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
const openRouterModel = "google/gemma-4-26b-a4b-it:free";
const requestTimeoutMs = 30000;

const requiredTextSchema = z.string().trim().min(1);

const isoDateStringSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
});

const meetingDraftSchema = z
  .object({
    title: requiredTextSchema,
    minutes: requiredTextSchema,
    actionItems: z.array(
      z
        .object({
          content: requiredTextSchema,
          assignee: requiredTextSchema.nullable(),
          dueDate: isoDateStringSchema.nullable(),
        })
        .strict(),
    ),
  })
  .strict();

const structureMeetingRequestSchema = z
  .object({
    minutes: requiredTextSchema,
  })
  .strict();

const openRouterResponseSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.string().nullable(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

export type MeetingDraft = z.infer<typeof meetingDraftSchema>;

export type ParseStructureMeetingRequestResult =
  | {
      readonly ok: true;
      readonly minutes: string;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

export class OpenRouterConfigurationError extends Error {
  constructor() {
    super("OpenRouter API key is not configured");
    this.name = "OpenRouterConfigurationError";
  }
}

export class OpenRouterRequestError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(status: number) {
    super(`OpenRouter request failed with status ${status}`);
    this.name = "OpenRouterRequestError";
    this.status = status;
    this.retryable = status === 408 || status === 429 || status >= 500;
  }
}

export class OpenRouterTimeoutError extends Error {
  readonly retryable = true;

  constructor() {
    super("OpenRouter request timed out");
    this.name = "OpenRouterTimeoutError";
  }
}

export class OpenRouterNetworkError extends Error {
  readonly retryable = true;

  constructor() {
    super("OpenRouter request failed before receiving a response");
    this.name = "OpenRouterNetworkError";
  }
}

export class AiMeetingValidationError extends Error {
  readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "AiMeetingValidationError";
  }
}

export const parseStructureMeetingRequest = (body: unknown): ParseStructureMeetingRequestResult => {
  const parseResult = structureMeetingRequestSchema.safeParse(body);

  if (!parseResult.success) {
    return { ok: false, message: "minutes is required" };
  }

  return { ok: true, minutes: parseResult.data.minutes };
};

export const parseOpenRouterMeetingDraft = (content: string): MeetingDraft => {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AiMeetingValidationError("AI response was not valid JSON");
    }

    throw error;
  }

  const parseResult = meetingDraftSchema.safeParse(parsedJson);

  if (!parseResult.success) {
    throw new AiMeetingValidationError("AI response did not match the expected meeting structure");
  }

  return parseResult.data;
};

export const structureMeetingMinutes = async (minutes: string): Promise<MeetingDraft> => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (apiKey === undefined || apiKey.length === 0) {
    throw new OpenRouterConfigurationError();
  }

  let response: Response;

  try {
    response = await fetch(openRouterUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: [
          {
            role: "system",
            content:
              "You structure Korean meeting minutes into JSON only. Return no markdown, no code fences, and no explanation. If an assignee or due date is not explicitly present in the source text, return null. dueDate must be an ISO UTC string like 2026-07-14T00:00:00.000Z or null.",
          },
          {
            role: "user",
            content: `Return exactly this JSON shape: {"title":"...","minutes":"...","actionItems":[{"content":"...","assignee":null,"dueDate":null}]}\n\nMeeting minutes:\n${minutes}`,
          },
        ],
        temperature: 0,
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new OpenRouterTimeoutError();
    }

    if (error instanceof TypeError) {
      throw new OpenRouterNetworkError();
    }

    throw error;
  }

  if (!response.ok) {
    throw new OpenRouterRequestError(response.status);
  }

  let responseBody: unknown;

  try {
    responseBody = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AiMeetingValidationError("OpenRouter response was not valid JSON");
    }

    throw error;
  }

  const parseResult = openRouterResponseSchema.safeParse(responseBody);

  if (!parseResult.success) {
    throw new AiMeetingValidationError("OpenRouter response did not include AI message content");
  }

  const firstChoice = parseResult.data.choices[0];

  if (firstChoice === undefined || firstChoice.message.content === null) {
    throw new AiMeetingValidationError("OpenRouter response did not include AI message content");
  }

  return parseOpenRouterMeetingDraft(firstChoice.message.content);
};
