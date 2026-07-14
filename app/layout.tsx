import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "회의록 액션아이템 관리",
  description: "AI가 구조화한 회의록 결과를 검토하고 저장합니다.",
};

type RootLayoutProps = {
  readonly children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/95 backdrop-blur">
          <nav className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3 md:px-6">
            <Link
              href="/"
              className="max-w-48 text-sm font-semibold leading-snug text-[var(--text-primary)] outline-none transition-colors hover:text-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] md:max-w-none md:text-base"
            >
              회의록 액션아이템 관리
            </Link>
            <Link
              href="/meetings"
              className="shrink-0 rounded-md border border-[var(--border-default)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              회의 목록
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-[1120px] px-4 py-8 md:px-6 md:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
