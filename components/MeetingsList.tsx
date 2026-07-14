"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorBox } from "@/components/ErrorBox";
import { primaryButtonClassName } from "@/components/FormControls";
import { Spinner } from "@/components/Spinner";
import { deleteMeeting, listMeetings, toApiError, type ApiError, type MeetingSummary } from "@/lib/api";
import { formatDateTime } from "@/lib/meetingFormat";

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly meetings: readonly MeetingSummary[] }
  | { readonly kind: "error"; readonly error: ApiError };

export function MeetingsList() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMeetings = async (): Promise<void> => {
    setState({ kind: "loading" });

    try {
      setState({ kind: "loaded", meetings: await listMeetings() });
    } catch (caughtError) {
      setState({ kind: "error", error: toApiError(caughtError) });
    }
  };

  useEffect(() => {
    void loadMeetings();
  }, []);

  const removeMeeting = async (id: string): Promise<void> => {
    setDeletingId(id);

    try {
      await deleteMeeting(id);
      setState((currentState) =>
        currentState.kind === "loaded"
          ? {
              kind: "loaded",
              meetings: currentState.meetings.filter((meeting) => meeting.id !== id),
            }
          : currentState,
      );
    } catch (caughtError) {
      setState({ kind: "error", error: toApiError(caughtError) });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">저장된 회의</h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">저장된 구조화 결과를 확인하고 관리합니다.</p>
        </div>
        <Link href="/" className={primaryButtonClassName}>
          첫 회의록 입력하기
        </Link>
      </section>

      {state.kind === "loading" ? (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
          <Spinner label="불러오는 중" />
        </div>
      ) : null}

      {state.kind === "error" ? <ErrorBox error={state.error} onRetry={loadMeetings} /> : null}

      {state.kind === "loaded" && state.meetings.length === 0 ? (
        <div className="space-y-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
          <p className="text-[var(--text-secondary)]">저장된 회의가 없습니다</p>
          <Link href="/" className={primaryButtonClassName}>
            첫 회의록 입력하기
          </Link>
        </div>
      ) : null}

      {state.kind === "loaded" && state.meetings.length > 0 ? (
        <div className="grid gap-4">
          {state.meetings.map((meeting) => (
            <article
              key={meeting.id}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <Link href={`/meetings/${meeting.id}`} className="min-w-0 flex-1 space-y-2 outline-none">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] transition hover:text-[var(--accent-primary)]">
                    {meeting.title}
                  </h2>
                  <p className="text-sm text-[var(--text-tertiary)]">생성일 {formatDateTime(meeting.createdAt)}</p>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    액션 {meeting.actionItemCount} · 결정 {meeting.decisionCount} · 논의 {meeting.discussionCount}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => void removeMeeting(meeting.id)}
                  disabled={deletingId === meeting.id}
                  className="rounded-md border border-[var(--status-error)] px-3 py-2 text-sm font-semibold text-[var(--status-error)] transition hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--status-error)] disabled:border-[var(--border-default)] disabled:text-[var(--text-tertiary)]"
                >
                  {deletingId === meeting.id ? "삭제 중" : "삭제"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
