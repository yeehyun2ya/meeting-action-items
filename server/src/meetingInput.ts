export type CreateSourceBackedTextInput = {
  readonly content: string;
  readonly sourceQuote: string;
};

export type CreateActionItemInput = {
  readonly content: string;
  readonly sourceQuote: string;
  readonly assignee: string | null;
  readonly dueDate: Date | null;
  readonly dueDateRaw: string | null;
};

export type CreateMeetingInput = {
  readonly title: string;
  readonly minutes: string;
  readonly decisions: readonly CreateSourceBackedTextInput[];
  readonly actionItems: readonly CreateActionItemInput[];
  readonly discussions: readonly CreateSourceBackedTextInput[];
};

export type ParseMeetingBodyResult =
  | {
      readonly ok: true;
      readonly value: CreateMeetingInput;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

type ParseActionItemResult =
  | {
      readonly ok: true;
      readonly value: CreateActionItemInput;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

type ParseSourceBackedTextItemResult =
  | {
      readonly ok: true;
      readonly value: CreateSourceBackedTextInput;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseRequiredText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  return trimmedValue;
};

const parseNullableText = (value: unknown): string | null | undefined => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
};

const parseNullableDate = (value: unknown): Date | null | undefined => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    return undefined;
  }

  return date;
};

const parseSourceBackedTextItem = (
  value: unknown,
  collectionName: string,
): ParseSourceBackedTextItemResult => {
  if (!isRecord(value)) {
    return { ok: false, message: `${collectionName} must contain objects` };
  }

  const content = parseRequiredText(value.content);

  if (content === null) {
    return { ok: false, message: `${collectionName}.content is required` };
  }

  const sourceQuote = parseRequiredText(value.sourceQuote);

  if (sourceQuote === null) {
    return { ok: false, message: `${collectionName}.sourceQuote is required` };
  }

  return {
    ok: true,
    value: {
      content,
      sourceQuote,
    },
  };
};

const parseActionItem = (value: unknown): ParseActionItemResult => {
  if (!isRecord(value)) {
    return { ok: false, message: "actionItems must contain objects" };
  }

  const content = parseRequiredText(value.content);

  if (content === null) {
    return { ok: false, message: "actionItems.content is required" };
  }

  const sourceQuote = parseRequiredText(value.sourceQuote);

  if (sourceQuote === null) {
    return { ok: false, message: "actionItems.sourceQuote is required" };
  }

  const assignee = parseNullableText(value.assignee);

  if (assignee === undefined) {
    return { ok: false, message: "actionItems.assignee must be a string or null" };
  }

  const dueDate = parseNullableDate(value.dueDate);

  if (dueDate === undefined) {
    return { ok: false, message: "actionItems.dueDate must be an ISO date string or null" };
  }

  const dueDateRaw = parseNullableText(value.dueDateRaw);

  if (dueDateRaw === undefined) {
    return { ok: false, message: "actionItems.dueDateRaw must be a string or null" };
  }

  return {
    ok: true,
    value: {
      content,
      sourceQuote,
      assignee,
      dueDate,
      dueDateRaw,
    },
  };
};

export const parseCreateMeetingBody = (body: unknown): ParseMeetingBodyResult => {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body must be a JSON object" };
  }

  const title = parseRequiredText(body.title);

  if (title === null) {
    return { ok: false, message: "title is required" };
  }

  const minutes = parseRequiredText(body.minutes);

  if (minutes === null) {
    return { ok: false, message: "minutes is required" };
  }

  if (!Array.isArray(body.actionItems)) {
    return { ok: false, message: "actionItems must be an array" };
  }

  if (!Array.isArray(body.decisions)) {
    return { ok: false, message: "decisions must be an array" };
  }

  if (!Array.isArray(body.discussions)) {
    return { ok: false, message: "discussions must be an array" };
  }

  const decisions: CreateSourceBackedTextInput[] = [];

  for (const decision of body.decisions) {
    const parsedDecision = parseSourceBackedTextItem(decision, "decisions");

    if (!parsedDecision.ok) {
      return parsedDecision;
    }

    decisions.push(parsedDecision.value);
  }

  const actionItems: CreateActionItemInput[] = [];

  for (const actionItem of body.actionItems) {
    const parsedActionItem = parseActionItem(actionItem);

    if (!parsedActionItem.ok) {
      return parsedActionItem;
    }

    actionItems.push(parsedActionItem.value);
  }

  const discussions: CreateSourceBackedTextInput[] = [];

  for (const discussion of body.discussions) {
    const parsedDiscussion = parseSourceBackedTextItem(discussion, "discussions");

    if (!parsedDiscussion.ok) {
      return parsedDiscussion;
    }

    discussions.push(parsedDiscussion.value);
  }

  return {
    ok: true,
    value: {
      title,
      minutes,
      decisions,
      actionItems,
      discussions,
    },
  };
};
