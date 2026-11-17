import { Suspense } from "react";
import DashboardScreen from "@/components/home/dashboard/DashboardScreen";

/**
 * ⑦ 대시보드 · 주간 재고 리포트 (C)
 *
 * 테스트용 주소:
 *   /dashboard                     이번 주 (실제 서버)
 *   /dashboard?week=2026-11-09     그 주 (아무 날짜나 넣으면 그 주 월요일 기준)
 *   /dashboard?mock=1              디자인 시안 숫자로 보기
 */
export default function Page({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={null}>
      <DashboardWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardWithParams({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const sp = await searchParams;
  return (
    <DashboardScreen
      week={typeof sp.week === "string" ? sp.week : undefined}
      mockOnly={sp.mock === "1"}
    />
  );
}
