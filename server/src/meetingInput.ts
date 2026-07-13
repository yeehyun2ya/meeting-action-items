export type CreateActionItemInput = {
  readonly content: string;
  readonly assignee: string | null;
  readonly dueDate: Date | null;
};

export type CreateMeetingInput = {
  readonly title: string;
  readonly minutes: string;
  readonly actionItems: readonly CreateActionItemInput[];
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

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseActionItem = (value: unknown): ParseActionItemResult => {
  if (!isRecord(value)) {
    return { ok: false, message: "actionItems must contain objects" };
  }

  const content = parseRequiredText(value.content);

  if (content === null) {
    return { ok: false, message: "actionItems.content is required" };
  }

  const assignee = parseNullableText(value.assignee);

  if (assignee === undefined) {
    return { ok: false, message: "actionItems.assignee must be a string or null" };
  }

  const dueDate = parseNullableDate(value.dueDate);

  if (dueDate === undefined) {
    return { ok: false, message: "actionItems.dueDate must be an ISO date string or null" };
  }

  return {
    ok: true,
    value: {
      content,
      assignee,
      dueDate,
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

  const actionItems: CreateActionItemInput[] = [];

  for (const actionItem of body.actionItems) {
    const parsedActionItem = parseActionItem(actionItem);

    if (!parsedActionItem.ok) {
      return parsedActionItem;
    }

    actionItems.push(parsedActionItem.value);
  }

  return {
    ok: true,
    value: {
      title,
      minutes,
      actionItems,
    },
  };
};
