"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBox } from "@/components/ErrorBox";
import {
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  textareaClassName,
} from "@/components/FormControls";
import { ActionReviewSection, TextReviewSection } from "@/components/ReviewSections";
import { Spinner } from "@/components/Spinner";
import {
  createMeeting,
  structureMeeting,
  toApiError,
  type ActionItem,
  type ApiError,
  type SourceBackedText,
} from "@/lib/api";

type Phase = "input" | "loading" | "review";

export function MeetingComposer() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [decisions, setDecisions] = useState<readonly SourceBackedText[]>([]);
  const [actionItems, setActionItems] = useState<readonly ActionItem[]>([]);
  const [discussions, setDiscussions] = useState<readonly SourceBackedText[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = title.trim().length > 0 && rawText.trim().length > 0 && phase !== "loading";

  const runStructure = async (): Promise<void> => {
    setError(null);
    setPhase("loading");

    try {
      const draft = await structureMeeting({ title, rawText });

      setDecisions(draft.decisions);
      setActionItems(draft.actionItems);
      setDiscussions(draft.discussions);
      setPhase("review");
    } catch (caughtError) {
      setError(toApiError(caughtError));
      setPhase("input");
    }
  };

  const saveMeeting = async (): Promise<void> => {
    setError(null);
    setIsSaving(true);

    try {
      const meeting = await createMeeting({
        title,
        minutes: rawText,
        decisions,
        actionItems,
        discussions,
      });

      router.push(`/meetings/${meeting.id}`);
    } catch (caughtError) {
      setError(toApiError(caughtError));
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-medium text-[var(--accent-primary)]">AI 구조화 검토</p>
        <h1 className="text-2xl font-bold leading-tight text-[var(--text-primary)] md:text-4xl">
          회의록 원문을 근거가 남는 실행 항목으로 정리합니다
        </h1>
        <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
          제목과 원문을 입력하면 AI가 결정사항, 액션아이템, 논의사항을 추출합니다. 저장하기 전에 모든 결과를
          직접 확인하고 수정할 수 있습니다.
        </p>
      </section>

      {error ? <ErrorBox error={error} onRetry={phase === "input" ? runStructure : saveMeeting} /> : null}

      {phase === "review" ? (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">회의 제목</p>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
            </div>
            <button type="button" onClick={() => setPhase("input")} className={secondaryButtonClassName}>
              다시 입력
            </button>
          </div>
          <details className="rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--text-secondary)]">
              회의록 원문 보기
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{rawText}</p>
          </details>
          <p className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
            AI가 추출한 결과입니다. 확인하고 수정한 뒤 저장하세요.
          </p>
          <TextReviewSection title="결정사항" items={decisions} onChange={setDecisions} />
          <ActionReviewSection items={actionItems} onChange={setActionItems} />
          <TextReviewSection title="논의사항" items={discussions} onChange={setDiscussions} />
          <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-6 md:flex-row">
            <button type="button" onClick={runStructure} disabled={isSaving} className={secondaryButtonClassName}>
              다시 구조화
            </button>
            <button type="button" onClick={saveMeeting} disabled={isSaving} className={primaryButtonClassName}>
              {isSaving ? <Spinner label="저장 중" /> : "회의 저장"}
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-5 rounded-md border border-[var(--border-default)] bg-[var(--surface-secondary)] p-5 md:p-6">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">회의 제목</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={phase === "loading"}
              className={inputClassName}
              placeholder="예: 주간 운영 회의"
            />
          </label>
          <label className="block space-y-2">
            <span className="flex items-center justify-between gap-3 text-sm font-medium text-[var(--text-secondary)]">
              <span>회의록 원문</span>
              <span className="font-normal text-[var(--text-tertiary)]">{rawText.length.toLocaleString("ko-KR")}자</span>
            </span>
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              disabled={phase === "loading"}
              rows={14}
              className={textareaClassName}
              placeholder="회의에서 오간 결정, 할 일, 논의 내용을 그대로 붙여넣으세요."
            />
          </label>
          <button type="button" onClick={runStructure} disabled={!canSubmit} className={primaryButtonClassName}>
            {phase === "loading" ? <Spinner label="AI가 회의록을 분석하고 있습니다" /> : "AI로 구조화하기"}
          </button>
        </section>
      )}
    </div>
  );
}
