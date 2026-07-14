type SpinnerProps = {
  readonly label?: string;
};

export function Spinner({ label = "불러오는 중" }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-current">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--accent-primary)]"
      />
      <span>{label}</span>
    </span>
  );
}
