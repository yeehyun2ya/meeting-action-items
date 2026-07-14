import type { ActionItem } from "@/lib/api";

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const formatDateOnly = (value: string | null): string => {
  if (value === null) {
    return "기한 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(new Date(value));
};

export const toDateInputValue = (value: string | null): string => {
  if (value === null) {
    return "";
  }

  return value.slice(0, 10);
};

export const fromDateInputValue = (value: string): string | null =>
  value.length === 0 ? null : `${value}T00:00:00.000Z`;

export const nullableText = (value: string): string | null => {
  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
};

export const actionItemDueLabel = (item: ActionItem): string => {
  if (item.dueDateRaw && item.dueDateRaw.length > 0) {
    return item.dueDateRaw;
  }

  return formatDateOnly(item.dueDate);
};
