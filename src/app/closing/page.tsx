import { Suspense } from "react";
import ClosingScreen from "@/components/sale/ClosingScreen";

/**
 * ⑤ 오늘 마감 기록 (B)
 *   /closing                  오늘
 *   /closing?date=2026-11-14  다른 날 기록 수정 (⑥ '기록 수정하기')
 *   /closing?left=8:5,9:2     ④-1에서 확인한 남은 수량
 *
 * cacheComponents 설정 때문에 주소의 ?값을 읽는 부분은 <Suspense> 안에 둔다.
 */
export default function Page({ searchParams }: PageProps<"/closing">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <ClosingWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function ClosingWithParams({ searchParams }: Pick<PageProps<"/closing">, "searchParams">) {
  const sp = await searchParams;
  const pick = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);
  const date = pick("date");
  return <ClosingScreen date={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined} left={pick("left")} />;
}
