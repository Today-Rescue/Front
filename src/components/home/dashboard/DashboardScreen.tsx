"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSlowFlag } from "@/hooks/useSlowFlag";
import { MOCK_DASHBOARD, fetchClosedDays, fetchDashboard } from "@/lib/dashboard";
import { ROUTES } from "@/lib/routes";
import type { DashboardResponse } from "@/types/dashboard";
import WeeklyWasteChart from "./WeeklyWasteChart";

/** 브라우저 기준 오늘 날짜 "YYYY-MM-DD" */
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ⑦ 대시보드 · 주간 재고 리포트 */
export default function DashboardScreen({ week, mockOnly = false }: { week?: string; mockOnly?: boolean }) {
  const [data, setData] = useState<DashboardResponse | null>(mockOnly ? MOCK_DASHBOARD : null);
  const [closedDays, setClosedDays] = useState<string[]>(mockOnly ? ["sat", "sun"] : []);
  const [failed, setFailed] = useState(false);
  const [today, setToday] = useState<string>("9999-12-31");
  const slow = useSlowFlag(!data);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 날짜는 브라우저에서만 정확히 알 수 있음
    if (!mockOnly) setToday(todayIso());
  }, [mockOnly]);

  useEffect(() => {
    if (mockOnly) return;
    let cancelled = false;
    Promise.all([fetchDashboard(week), fetchClosedDays()])
      .then(([res, closed]) => {
        if (cancelled) return;
        setData(res);
        setClosedDays(closed);
      })
      .catch((err) => {
        console.warn("[dashboard] 불러오기 실패, 예시 데이터로 보여줘요", err);
        if (cancelled) return;
        setData(MOCK_DASHBOARD);
        setClosedDays(["sat", "sun"]);
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [week, mockOnly]);

  if (!data) {
    return (
      <main className="px-6 pt-6">
        <h1 className="text-heading-lg font-bold">이번 주 재고 리포트</h1>
        <div className="mt-4 space-y-3" aria-busy>
          <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />
        </div>
        {slow && <p className="mt-4 text-center text-caption text-gray-600">서버를 깨우는 중이에요. 처음엔 최대 1분 걸릴 수 있어요.</p>}
      </main>
    );
  }

  const { waste, discount, frequent_leftovers: leftovers, suggestion } = data;
  // 서버는 비율(-0.94 = −94%, 0.63 = 63%)로 줌. 화면에는 반올림한 퍼센트로 보여줌
  const changePercent = waste.change_rate === null ? null : Math.round(waste.change_rate * 100);
  const salePercent = discount.sale_rate === null ? null : Math.round(discount.sale_rate * 100);
  const decreased = changePercent !== null && changePercent < 0;

  return (
    <main className="pb-8">
      {/* 1. 제목 */}
      <header className="px-6 pt-6 pb-4">
        <h1 className="text-heading-lg font-bold">이번 주 재고 리포트</h1>
        {failed && (
          <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-600">
            서버에 연결하지 못해 예시 데이터를 보여주고 있어요.
          </p>
        )}
      </header>

      {/* 2. 폐기 카드 */}
      <section className="mx-6 rounded-2xl bg-primary-50 px-5 py-5">
        <div className="flex items-center justify-between">
          <p className="text-body-md text-gray-700">이번 주 폐기 수량</p>
          {changePercent !== null && (
            <span
              className={`rounded-md px-2 py-1 text-label-md font-semibold text-white ${
                decreased ? "bg-success-300" : "bg-error-300"
              }`}
            >
              지난주 대비 {changePercent > 0 ? "+" : changePercent < 0 ? "−" : ""}
              {Math.abs(changePercent)}%
            </span>
          )}
        </div>
        <p className="mt-1 text-display-lg font-bold">
          {waste.this_week}
          <span className="text-heading-md">개</span>
        </p>
        <p className="mt-1 break-keep text-body-md text-gray-700">
          지난주 {waste.last_week}개 → 이번 주 {waste.this_week}개
          {waste.reduced > 0 && ` · ${waste.reduced}개를 덜 버렸어요`}
          {waste.reduced < 0 && ` · ${-waste.reduced}개를 더 버렸어요`}
        </p>
      </section>

      {/* 3. 요약 카드 2개 */}
      <div className="mx-6 mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-primary-50 px-4 py-4">
          <p className="text-caption font-medium text-primary-600">할인으로 살린 빵</p>
          <p className="mt-1 text-heading-md font-bold text-primary-600">{discount.sold_qty}개</p>
          <p className="text-caption text-gray-600">마감 세일·세트</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-4 py-4">
          <p className="text-caption font-medium text-gray-700">마감 세일 판매율</p>
          <p className="mt-1 text-heading-md font-bold">{salePercent === null ? "–" : `${salePercent}%`}</p>
          <p className="text-caption text-gray-600">
            {discount.target_qty > 0 ? `할인 대상 ${discount.target_qty}개 중` : "아직 마감 세일 기록이 없어요"}
          </p>
        </div>
      </div>

      {/* 4. 요일별 폐기 수량 */}
      <WeeklyWasteChart
        days={data.daily_waste}
        closedDays={closedDays}
        today={mockOnly || failed ? "9999-12-31" : today}
        comment={data.daily_comment}
      />

      {/* 5. 자주 남는 빵 */}
      <section className="mt-7 px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-title-lg font-bold">자주 남는 빵</h2>
          <span className="text-caption text-gray-600">
            {leftovers[0]?.total_days ?? 5}일 중 남은 날
          </span>
        </div>

        {leftovers.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-gray-100 px-5 py-6 text-center text-body-md text-gray-600">
            최근에 자주 남은 빵이 없어요 👍
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {leftovers.map((it) => (
              <li key={it.item_id} className="rounded-2xl bg-gray-100 px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-title-sm font-semibold">{it.name}</span>
                  <span className="text-title-sm font-semibold">{it.left_days}일</span>
                </div>
                <div className="mt-2 flex gap-1" aria-label={`${it.total_days}일 중 ${it.left_days}일 남음`}>
                  {it.days.map((d) => (
                    <span
                      key={d.date}
                      className={`h-2.5 flex-1 rounded-full ${d.left ? "bg-error-300" : "bg-gray-300"}`}
                      title={`${d.date} ${d.left ? "남음" : "완판"}`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-body-md text-gray-700">{actionText(it.actions)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 6. 다음 주 제안 */}
      {suggestion && (
        <section className="mx-6 mt-4 rounded-2xl border border-primary-100 bg-primary-50 px-5 py-5">
          <p className="text-label-md font-semibold text-primary-600">다음 주 이렇게 해볼까요</p>
          <p className="mt-2 text-body-lg">{suggestion.message}</p>
          {suggestion.type === "reduce_production" && (
            <Link
              href={ROUTES.recommend}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary-100 text-label-md font-semibold text-primary-600"
            >
              내일 생산 추천 보기
            </Link>
          )}
          {/* TODO(C): 알림 시각 제안(action 있음)이 오면 '알림 시각 18:00으로 설정' 버튼 → PATCH /stores/{id} { alert_hours_before } */}
        </section>
      )}
    </main>
  );
}

function actionText({ discount_days, bundle_days }: { discount_days: number; bundle_days: number }) {
  if (discount_days > 0 && bundle_days > 0) return `마감 할인 ${discount_days}일 · 세트 ${bundle_days}일로 팔았어요`;
  if (discount_days > 0) return `남은 날 중 ${discount_days}일은 마감 할인으로 팔았어요`;
  if (bundle_days > 0) return `남은 날 중 ${bundle_days}일은 세트로 묶어 팔았어요`;
  return "아직 할인이나 세트로 팔아본 적이 없어요";
}
