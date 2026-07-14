"use client";

import { ActionItemEditor, TextItemEditor, type ActionItemPatchInput } from "@/components/EditableItems";
import type { ActionItem, SourceBackedText } from "@/lib/api";

type SectionTitleProps = {
  readonly title: string;
  readonly count: number;
};

type TextItemsSectionProps = {
  readonly title: string;
  readonly items: readonly SourceBackedText[];
  readonly deletingId: string | null;
  readonly onPatch: (itemId: string | undefined, content: string) => Promise<void>;
  readonly onDelete: (itemId: string | undefined) => Promise<void>;
};

type ActionItemsSectionProps = {
  readonly items: readonly ActionItem[];
  readonly deletingId: string | null;
  readonly onPatch: (itemId: string | undefined, input: ActionItemPatchInput) => Promise<void>;
  readonly onDelete: (itemId: string | undefined) => Promise<void>;
};

function SectionTitle({ title, count }: SectionTitleProps) {
  return (
    <h2 className="text-xl font-bold text-[var(--text-primary)]">
      {title} ({count})
    </h2>
  );
}

function EmptySectionMessage() {
  return <p className="p-4 text-sm text-[var(--text-tertiary)]">추출된 항목이 없습니다</p>;
}

export function TextItemsSection({ title, items, deletingId, onPatch, onDelete }: TextItemsSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle title={title} count={items.length} />
      <div className="divide-y divide-[var(--border-subtle)] rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)]">
        {items.length === 0 ? (
          <EmptySectionMessage />
        ) : (
          items.map((item) => (
            <TextItemEditor
              key={item.id ?? item.sourceQuote}
              item={item}
              label="내용"
              isDeleting={deletingId === item.id}
              onPatch={(content) => onPatch(item.id, content)}
              onDelete={() => onDelete(item.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function ActionItemsSection({ items, deletingId, onPatch, onDelete }: ActionItemsSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle title="액션아이템" count={items.length} />
      <div className="divide-y divide-[var(--border-subtle)] rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)]">
        {items.length === 0 ? (
          <EmptySectionMessage />
        ) : (
          items.map((item) => (
            <ActionItemEditor
              key={item.id ?? item.sourceQuote}
              item={item}
              isDeleting={deletingId === item.id}
              onPatch={(input) => onPatch(item.id, input)}
              onDelete={() => onDelete(item.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
