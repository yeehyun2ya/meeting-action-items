import type { ApiError } from "@/lib/api";

type ErrorBoxProps = {
  readonly error: ApiError;
  readonly onRetry?: () => void;
};

export function ErrorBox({ error, onRetry }: ErrorBoxProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-[var(--status-error)] bg-[var(--surface-secondary)] p-4 text-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-[var(--status-error)]">{error.message}</p>
          <p className="font-mono text-xs text-[var(--text-tertiary)]">{error.code}</p>
        </div>
        {error.retryable && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="w-fit rounded-md border border-[var(--status-warning)] px-3 py-2 font-medium text-[var(--status-warning)] transition hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--status-warning)]"
          >
            다시 시도
          </button>
        ) : null}
      </div>
    </div>
  );
}
