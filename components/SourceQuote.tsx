type SourceQuoteProps = {
  readonly quote: string;
};

export function SourceQuote({ quote }: SourceQuoteProps) {
  return (
    <p className="rounded-md bg-[var(--surface-elevated)] px-3 py-2 text-sm leading-6 text-[var(--text-secondary)]">
      근거: {quote}
    </p>
  );
}
