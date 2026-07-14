"use client";

import { useState } from "react";
import { dangerButtonClassName, inputClassName } from "@/components/FormControls";
import { SourceQuote } from "@/components/SourceQuote";
import type { ActionItem, SourceBackedText } from "@/lib/api";
import { fromDateInputValue, nullableText, toDateInputValue } from "@/lib/meetingFormat";

type TextItemEditorProps = {
  readonly item: SourceBackedText;
  readonly label: string;
  readonly isDeleting: boolean;
  readonly onPatch: (content: string) => Promise<void>;
  readonly onDelete: () => Promise<void>;
};

type ActionItemEditorProps = {
  readonly item: ActionItem;
  readonly isDeleting: boolean;
  readonly onPatch: (input: ActionItemPatchInput) => Promise<void>;
  readonly onDelete: () => Promise<void>;
};

export type ActionItemPatchInput = {
  readonly content?: string;
  readonly assignee?: string | null;
  readonly dueDate?: string | null;
  readonly dueDateRaw?: string | null;
};

export function TextItemEditor({ item, label, isDeleting, onPatch, onDelete }: TextItemEditorProps) {
  const [content, setContent] = useState(item.content);
  const [isSaving, setIsSaving] = useState(false);

  const patchIfChanged = async (): Promise<void> => {
    const trimmed = content.trim();

    if (trimmed.length === 0 || trimmed === item.content) {
      setContent(item.content);
      return;
    }

    setIsSaving(true);
    try {
      await onPatch(trimmed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onBlur={() => void patchIfChanged()}
          disabled={isSaving || isDeleting}
          className={inputClassName}
        />
      </label>
      <SourceQuote quote={item.sourceQuote} />
      <button type="button" onClick={() => void onDelete()} disabled={isDeleting} className={dangerButtonClassName}>
        {isDeleting ? "삭제 중" : "삭제"}
      </button>
    </div>
  );
}

export function ActionItemEditor({ item, isDeleting, onPatch, onDelete }: ActionItemEditorProps) {
  const [content, setContent] = useState(item.content);
  const [assignee, setAssignee] = useState(item.assignee ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(item.dueDate));
  const [isSaving, setIsSaving] = useState(false);

  const patchContent = async (): Promise<void> => {
    const nextValue = content.trim();

    if (nextValue.length === 0 || nextValue === item.content) {
      setContent(item.content);
      return;
    }

    setIsSaving(true);
    try {
      await onPatch({ content: nextValue });
    } finally {
      setIsSaving(false);
    }
  };

  const patchAssignee = async (): Promise<void> => {
    const nextValue = nullableText(assignee);

    if (nextValue === item.assignee) {
      setAssignee(item.assignee ?? "");
      return;
    }

    setIsSaving(true);
    try {
      await onPatch({ assignee: nextValue });
    } finally {
      setIsSaving(false);
    }
  };

  const patchDateField = async (): Promise<void> => {
    const nextDueDate = fromDateInputValue(dueDate);

    if (nextDueDate === item.dueDate) {
      return;
    }

    setIsSaving(true);
    try {
      await onPatch({ dueDate: nextDueDate, dueDateRaw: null });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">할 일</span>
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onBlur={() => void patchContent()}
          disabled={isSaving || isDeleting}
          className={inputClassName}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">담당자</span>
          <input
            value={assignee}
            placeholder="원문에 없음"
            onChange={(event) => setAssignee(event.target.value)}
            onBlur={() => void patchAssignee()}
            disabled={isSaving || isDeleting}
            className={inputClassName}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">기한</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            onBlur={() => void patchDateField()}
            disabled={isSaving || isDeleting}
            className={inputClassName}
          />
        </label>
      </div>
      <SourceQuote quote={item.sourceQuote} />
      <button type="button" onClick={() => void onDelete()} disabled={isDeleting} className={dangerButtonClassName}>
        {isDeleting ? "삭제 중" : "삭제"}
      </button>
    </div>
  );
}
