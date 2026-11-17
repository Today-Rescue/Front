import { Suspense } from "react";
import RecordsScreen from "@/components/sale/RecordsScreen";

/**
 * ⑥ 판매 기록 (B, 탭)
 *   /records                  오늘
 *   /records?date=2026-11-14  그 날짜 (⑤ 저장 후 이동)
 */
export default function Page({ searchParams }: PageProps<"/records">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <RecordsWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function RecordsWithParams({ searchParams }: Pick<PageProps<"/records">, "searchParams">) {
  const sp = await searchParams;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined;
  return <RecordsScreen date={date} />;
}
