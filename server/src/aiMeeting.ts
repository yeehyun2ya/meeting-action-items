import { z } from "zod";

const openRouterUrl = process.env.OPENROUTER_URL ?? "https://openrouter.ai/api/v1/chat/completions";
const openRouterModel = "google/gemma-4-26b-a4b-it:free";
const requestTimeoutMs = 30000;

const requiredTextSchema = z.string().trim().min(1);

const sourceBackedTextItemSchema = z
  .object({
    content: requiredTextSchema,
    sourceQuote: requiredTextSchema,
  })
  .strict();

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
    decisions: z.array(sourceBackedTextItemSchema),
    actionItems: z.array(
      z
        .object({
          content: requiredTextSchema,
          sourceQuote: requiredTextSchema,
          assignee: requiredTextSchema.nullable(),
          dueDate: isoDateStringSchema.nullable(),
          dueDateRaw: requiredTextSchema.nullable(),
        })
        .strict(),
    ),
    discussions: z.array(sourceBackedTextItemSchema),
  })
  .strict();

const structureMeetingSystemPrompt = [
  "You structure Korean meeting minutes into JSON only.",
  "Return no markdown, no code fences, and no explanation.",
  "분류 기준:",
  "- 결정사항(decisions): 회의에서 확정된 사항. 이미 정해진 것.",
  "- 액션아이템(actionItems): 앞으로 누군가 해야 할 일. 담당자와 기한이 원문에 있으면 채우고, 없으면 반드시 null로 둔다. 추정하지 않는다.",
  "- 논의사항(discussions): 안건에 대해 논의됐으나 결론이 나지 않은 내용.",
  "세 분류 중 해당 항목이 없으면 빈 배열을 반환한다. 억지로 채우지 않는다.",
  "같은 문장을 결정사항, 액션아이템, 논의사항에 중복해서 넣지 않는다.",
  "인사말, 잡담, 단순 정보 공유, 배경 설명은 어느 분류에도 포함하지 않는다. 예: '지난달 매출이 12% 올랐습니다'처럼 결론도 실행도 요구하지 않는 단순 보고는 제외한다.",
  "sourceQuote는 반드시 입력된 회의록 원문에 실제로 존재하는 문장을 그대로 옮겨 적어야 한다. 요약하거나 변형하지 말 것.",
  "dueDateRaw에는 원문에 나온 기한 표현을 그대로 옮겨 적는다. 변형하지 않는다. 기한 언급이 없으면 null.",
  "'다음 주까지', '금요일까지' 같은 상대적 표현은 절대 날짜로 계산하지 않는다. dueDate는 null로 두고 dueDateRaw에만 표현을 담는다. 원문에 '7월 20일'처럼 명시적 날짜가 있을 때만 dueDate를 채운다.",
  "dueDate must be an ISO UTC string like 2026-07-14T00:00:00.000Z or null.",
].join("\n");

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

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/g, " ");

const assertSourceQuoteInMinutes = (
  normalizedMinutes: string,
  category: "decisions" | "actionItems" | "discussions",
  index: number,
  sourceQuote: string,
): void => {
  if (normalizedMinutes.includes(normalizeWhitespace(sourceQuote))) {
    return;
  }

  throw new AiMeetingValidationError(
    `AI response sourceQuote was not found in source minutes: ${category}[${index}].sourceQuote="${sourceQuote}"`,
  );
};

const validateMeetingDraftSourceQuotes = (meetingDraft: MeetingDraft, minutes: string): void => {
  const normalizedMinutes = normalizeWhitespace(minutes);

  meetingDraft.decisions.forEach((decision, index) => {
    assertSourceQuoteInMinutes(normalizedMinutes, "decisions", index, decision.sourceQuote);
  });

  meetingDraft.actionItems.forEach((actionItem, index) => {
    assertSourceQuoteInMinutes(normalizedMinutes, "actionItems", index, actionItem.sourceQuote);
  });

  meetingDraft.discussions.forEach((discussion, index) => {
    assertSourceQuoteInMinutes(normalizedMinutes, "discussions", index, discussion.sourceQuote);
  });
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
            content: structureMeetingSystemPrompt,
          },
          {
            role: "user",
            content: `Return exactly this JSON shape: {"title":"...","minutes":"...","decisions":[{"content":"...","sourceQuote":"..."}],"actionItems":[{"content":"...","sourceQuote":"...","assignee":null,"dueDate":null,"dueDateRaw":null}],"discussions":[{"content":"...","sourceQuote":"..."}]}\n\nMeeting minutes:\n${minutes}`,
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

  const meetingDraft = parseOpenRouterMeetingDraft(firstChoice.message.content);
  validateMeetingDraftSourceQuotes(meetingDraft, minutes);

  return meetingDraft;
};
