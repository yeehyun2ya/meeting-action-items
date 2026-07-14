const API_BASE = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:4000";

export type ApiError = {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
};

export class ApiClientError extends Error implements ApiError {
  readonly code: string;
  readonly retryable: boolean;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.code = error.code;
    this.retryable = error.retryable;
  }
}

export type SourceBackedText = {
  readonly id?: string;
  readonly content: string;
  readonly sourceQuote: string;
};

export type ActionItem = {
  readonly id?: string;
  readonly content: string;
  readonly sourceQuote: string;
  readonly assignee: string | null;
  readonly dueDate: string | null;
  readonly dueDateRaw?: string | null;
};

export type MeetingDraft = {
  readonly title?: string;
  readonly minutes?: string;
  readonly decisions: readonly SourceBackedText[];
  readonly actionItems: readonly ActionItem[];
  readonly discussions: readonly SourceBackedText[];
};

export type Meeting = {
  readonly id: string;
  readonly title: string;
  readonly minutes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly decisions: readonly SourceBackedText[];
  readonly actionItems: readonly ActionItem[];
  readonly discussions: readonly SourceBackedText[];
};

export type MeetingSummary = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly decisionCount: number;
  readonly decisionPreview: readonly SourceBackedText[];
  readonly actionItemCount: number;
  readonly actionItemPreview: readonly Pick<ActionItem, "id" | "content" | "sourceQuote" | "dueDateRaw">[];
  readonly discussionCount: number;
  readonly discussionPreview: readonly SourceBackedText[];
};

export type CreateMeetingInput = {
  readonly title: string;
  readonly minutes: string;
  readonly decisions: readonly SourceBackedText[];
  readonly actionItems: readonly ActionItem[];
  readonly discussions: readonly SourceBackedText[];
};

export type ActionItemPatch = {
  readonly content?: string;
  readonly assignee?: string | null;
  readonly dueDate?: string | null;
  readonly dueDateRaw?: string | null;
};

export type TextItemPatch = {
  readonly content: string;
};

const fallbackError: ApiError = {
  code: "INTERNAL_ERROR",
  message: "알 수 없는 오류가 발생했습니다",
  retryable: false,
};

const networkError: ApiError = {
  code: "NETWORK_ERROR",
  message: "서버에 연결할 수 없습니다",
  retryable: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseApiError = (value: unknown): ApiError => {
  if (!isRecord(value)) {
    return fallbackError;
  }

  const { code, message, retryable } = value;

  if (typeof code !== "string" || typeof message !== "string" || typeof retryable !== "boolean") {
    return fallbackError;
  }

  return { code, message, retryable };
};

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }

  return fallbackError;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError(networkError);
  }

  if (!response.ok) {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = fallbackError;
    }

    throw new ApiClientError(parseApiError(body));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const structureMeeting = (input: {
  readonly title: string;
  readonly rawText: string;
}): Promise<MeetingDraft> =>
  request<MeetingDraft>("/ai/structure-meeting", {
    method: "POST",
    body: JSON.stringify({ minutes: input.rawText }),
  });

export const createMeeting = (input: CreateMeetingInput): Promise<Meeting> =>
  request<Meeting>("/meetings", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const listMeetings = (): Promise<readonly MeetingSummary[]> =>
  request<readonly MeetingSummary[]>("/meetings");

export const getMeeting = (id: string): Promise<Meeting> => request<Meeting>(`/meetings/${id}`);

export const updateMeeting = (id: string, input: { readonly title: string }): Promise<Meeting> =>
  request<Meeting>(`/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const updateActionItem = (id: string, input: ActionItemPatch): Promise<ActionItem> =>
  request<ActionItem>(`/action-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const updateDecision = (id: string, input: TextItemPatch): Promise<SourceBackedText> =>
  request<SourceBackedText>(`/decisions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const updateDiscussionPoint = (id: string, input: TextItemPatch): Promise<SourceBackedText> =>
  request<SourceBackedText>(`/discussion-points/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteMeeting = (id: string): Promise<void> =>
  request<void>(`/meetings/${id}`, { method: "DELETE" });

export const deleteActionItem = (id: string): Promise<void> =>
  request<void>(`/action-items/${id}`, { method: "DELETE" });

export const deleteDecision = (id: string): Promise<void> =>
  request<void>(`/decisions/${id}`, { method: "DELETE" });

export const deleteDiscussionPoint = (id: string): Promise<void> =>
  request<void>(`/discussion-points/${id}`, { method: "DELETE" });
