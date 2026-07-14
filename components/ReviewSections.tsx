"use client";

import type { ActionItem, SourceBackedText } from "@/lib/api";
import { fromDateInputValue, nullableText, toDateInputValue } from "@/lib/meetingFormat";
import { dangerButtonClassName, inputClassName } from "@/components/FormControls";
import { SourceQuote } from "@/components/SourceQuote";

type TextSectionProps = {
  readonly title: string;
  readonly items: readonly SourceBackedText[];
  readonly onChange: (items: readonly SourceBackedText[]) => void;
};

type ActionSectionProps = {
  readonly items: readonly ActionItem[];
  readonly onChange: (items: readonly ActionItem[]) => void;
};

const replaceTextItem = (
  items: readonly SourceBackedText[],
  index: number,
  content: string,
): readonly SourceBackedText[] =>
  items.map((item, currentIndex) =>
    currentIndex === index
      ? {
          ...item,
          content,
        }
      : item,
  );

const removeItem = <T,>(items: readonly T[], index: number): readonly T[] =>
  items.filter((_item, currentIndex) => currentIndex !== index);

const replaceActionItem = (
  items: readonly ActionItem[],
  index: number,
  item: ActionItem,
): readonly ActionItem[] =>
  items.map((currentItem, currentIndex) => (currentIndex === index ? item : currentItem));

export function TextReviewSection({ title, items, onChange }: TextSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-[var(--text-primary)]">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-tertiary)]">
          추출된 항목이 없습니다
        </p>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)] rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)]">
          {items.map((item, index) => (
            <div key={`${item.sourceQuote}-${index}`} className="space-y-3 p-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">내용</span>
                <input
                  value={item.content}
                  onChange={(event) => onChange(replaceTextItem(items, index, event.target.value))}
                  className={inputClassName}
                />
              </label>
              <SourceQuote quote={item.sourceQuote} />
              <button
                type="button"
                onClick={() => onChange(removeItem(items, index))}
                className={dangerButtonClassName}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ActionReviewSection({ items, onChange }: ActionSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-[var(--text-primary)]">액션아이템 ({items.length})</h2>
      {items.length === 0 ? (
        <p className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-tertiary)]">
          추출된 항목이 없습니다
        </p>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)] rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)]">
          {items.map((item, index) => (
            <div key={`${item.sourceQuote}-${index}`} className="space-y-3 p-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">할 일</span>
                <input
                  value={item.content}
                  onChange={(event) =>
                    onChange(replaceActionItem(items, index, { ...item, content: event.target.value }))
                  }
                  className={inputClassName}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">담당자</span>
                  <input
                    value={item.assignee ?? ""}
                    placeholder="원문에 없음"
                    onChange={(event) =>
                      onChange(
                        replaceActionItem(items, index, {
                          ...item,
                          assignee: nullableText(event.target.value),
                        }),
                      )
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">기한</span>
                  <input
                    type="date"
                    value={toDateInputValue(item.dueDate)}
                    onChange={(event) =>
                      onChange(
                        replaceActionItem(items, index, {
                          ...item,
                          dueDate: fromDateInputValue(event.target.value),
                          dueDateRaw: null,
                        }),
                      )
                    }
                    className={inputClassName}
                  />
                </label>
              </div>
              <SourceQuote quote={item.sourceQuote} />
              <button
                type="button"
                onClick={() => onChange(removeItem(items, index))}
                className={dangerButtonClassName}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
