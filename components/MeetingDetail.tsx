"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ActionItemPatchInput } from "@/components/EditableItems";
import { ErrorBox } from "@/components/ErrorBox";
import { dangerButtonClassName, inputClassName, secondaryButtonClassName } from "@/components/FormControls";
import { ActionItemsSection, TextItemsSection } from "@/components/MeetingDetailSections";
import { Spinner } from "@/components/Spinner";
import {
  deleteActionItem,
  deleteDecision,
  deleteDiscussionPoint,
  deleteMeeting,
  getMeeting,
  toApiError,
  updateActionItem,
  updateDecision,
  updateDiscussionPoint,
  updateMeeting,
  type ApiError,
  type Meeting,
} from "@/lib/api";
import { formatDateTime } from "@/lib/meetingFormat";

type DetailState =
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly meeting: Meeting }
  | { readonly kind: "error"; readonly error: ApiError };

type MeetingDetailProps = {
  readonly id: string;
};

export function MeetingDetail({ id }: MeetingDetailProps) {
  const router = useRouter();
  const [state, setState] = useState<DetailState>({ kind: "loading" });
  const [pageError, setPageError] = useState<ApiError | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);

  const loadMeeting = async (): Promise<void> => {
    setState({ kind: "loading" });
    setPageError(null);

    try {
      const meeting = await getMeeting(id);
      setTitleDraft(meeting.title);
      setState({ kind: "loaded", meeting });
    } catch (caughtError) {
      setState({ kind: "error", error: toApiError(caughtError) });
    }
  };

  useEffect(() => {
    void loadMeeting();
  }, [id]);

  const updateLoadedMeeting = (meeting: Meeting): void => {
    setState({ kind: "loaded", meeting });
    setTitleDraft(meeting.title);
  };

  const patchTitle = async (): Promise<void> => {
    if (state.kind !== "loaded") {
      return;
    }

    const nextTitle = titleDraft.trim();

    if (nextTitle.length === 0 || nextTitle === state.meeting.title) {
      setTitleDraft(state.meeting.title);
      return;
    }

    try {
      updateLoadedMeeting(await updateMeeting(state.meeting.id, { title: nextTitle }));
    } catch (caughtError) {
      setPageError(toApiError(caughtError));
      setTitleDraft(state.meeting.title);
    }
  };

  const removeMeeting = async (): Promise<void> => {
    setIsDeletingMeeting(true);

    try {
      await deleteMeeting(id);
      router.push("/meetings");
    } catch (caughtError) {
      setPageError(toApiError(caughtError));
      setIsDeletingMeeting(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
        <Spinner label="불러오는 중" />
      </div>
    );
  }

  if (state.kind === "error") {
    if (state.error.code === "NOT_FOUND") {
      return (
        <div className="space-y-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">삭제되었거나 존재하지 않는 회의입니다</h1>
          <Link href="/meetings" className={secondaryButtonClassName}>
            목록으로
          </Link>
        </div>
      );
    }

    return <ErrorBox error={state.error} onRetry={loadMeeting} />;
  }

  const { meeting } = state;

  const patchDecision = async (itemId: string | undefined, content: string): Promise<void> => {
    if (typeof itemId !== "string") {
      return;
    }

    try {
      const updated = await updateDecision(itemId, { content });
      updateLoadedMeeting({
        ...meeting,
        decisions: meeting.decisions.map((item) => (item.id === itemId ? updated : item)),
      });
    } catch (caughtError) {
      setPageError(toApiError(caughtError));
    }
  };

  const patchDiscussion = async (itemId: string | undefined, content: string): Promise<void> => {
    if (typeof itemId !== "string") {
      return;
    }

    try {
      const updated = await updateDiscussionPoint(itemId, { content });
      updateLoadedMeeting({
        ...meeting,
        discussions: meeting.discussions.map((item) => (item.id === itemId ? updated : item)),
      });
    } catch (caughtError) {
      setPageError(toApiError(caughtError));
    }
  };

  const patchActionItem = async (
    itemId: string | undefined,
    input: ActionItemPatchInput,
  ): Promise<void> => {
    if (typeof itemId !== "string") {
      return;
    }

    try {
      const updated = await updateActionItem(itemId, input);
      updateLoadedMeeting({
        ...meeting,
        actionItems: meeting.actionItems.map((item) => (item.id === itemId ? updated : item)),
      });
    } catch (caughtError) {
      setPageError(toApiError(caughtError));
    }
  };

  const removeItem = async (
    itemId: string | undefined,
    deleteRequest: (nextId: string) => Promise<void>,
  ): Promise<void> => {
    if (typeof itemId !== "string") {
      return;
    }

    setDeletingId(itemId);
    setPageError(null);

    try {
      await deleteRequest(itemId);
      updateLoadedMeeting({
        ...meeting,
        decisions: meeting.decisions.filter((item) => item.id !== itemId),
        actionItems: meeting.actionItems.filter((item) => item.id !== itemId),
        discussions: meeting.discussions.filter((item) => item.id !== itemId),
      });
    } catch (caughtError) {
      setPageError(toApiError(caughtError));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {pageError ? <ErrorBox error={pageError} onRetry={loadMeeting} /> : null}
      <section className="space-y-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <label className="block flex-1 space-y-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">회의 제목</span>
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={() => void patchTitle()}
              className={inputClassName}
            />
          </label>
          <button
            type="button"
            onClick={() => void removeMeeting()}
            disabled={isDeletingMeeting}
            className={dangerButtonClassName}
          >
            {isDeletingMeeting ? "삭제 중" : "회의 삭제"}
          </button>
        </div>
        <p className="text-sm text-[var(--text-tertiary)]">생성일 {formatDateTime(meeting.createdAt)}</p>
      </section>

      <details className="rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--text-secondary)]">회의록 원문 보기</summary>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{meeting.minutes}</p>
      </details>

      <TextItemsSection
        title="결정사항"
        items={meeting.decisions}
        deletingId={deletingId}
        onPatch={patchDecision}
        onDelete={(itemId) => removeItem(itemId, deleteDecision)}
      />

      <ActionItemsSection
        items={meeting.actionItems}
        deletingId={deletingId}
        onPatch={patchActionItem}
        onDelete={(itemId) => removeItem(itemId, deleteActionItem)}
      />

      <TextItemsSection
        title="논의사항"
        items={meeting.discussions}
        deletingId={deletingId}
        onPatch={patchDiscussion}
        onDelete={(itemId) => removeItem(itemId, deleteDiscussionPoint)}
      />
    </div>
  );
}
