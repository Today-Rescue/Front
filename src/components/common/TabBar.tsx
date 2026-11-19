"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_MAX_WIDTH, TAB_BAR_HEIGHT, TABS, type TabKey } from "./layout";

/**
 * 하단 탭바 (오늘 · 추천 · 기록 · 대시보드)
 * - 화면 하단 고정, 현재 탭은 주황 아이콘 + 진한 주황 굵은 글자
 * - AppShell이 알아서 붙이므로 각 화면에서 직접 쓸 필요 없음
 */
export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed bottom-0 left-1/2 z-40 w-full -translate-x-1/2 border-t border-gray-200 bg-white"
      style={{ maxWidth: APP_MAX_WIDTH, paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex" style={{ height: TAB_BAR_HEIGHT }}>
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-caption ${
                  active ? "font-bold text-primary-600" : "font-medium text-gray-700"
                }`}
              >
                <TabIcon tab={tab.key} active={active} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 임시 아이콘. 디자인에서 아이콘이 나오면 교체 */
function TabIcon({ tab, active }: { tab: TabKey; active: boolean }) {
  const color = active ? "var(--color-primary-500)" : "var(--color-gray-700)";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (tab) {
    case "today":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case "recommend":
      return (
        <svg {...common}>
          <path d="M9 11.5l3 3 8-8" />
          <path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "records":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M12 3 2 8l10 5 10-5z" />
          <path d="M2 12.5 12 17.5l10-5M2 17l10 5 10-5" />
        </svg>
      );
  }
}
