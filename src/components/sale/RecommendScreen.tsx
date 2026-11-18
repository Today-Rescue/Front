"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { fetchRecommendation, fetchSalesRecord, fetchStoreDong } from "./api";
import { MOCK_RECOMMENDATION } from "./mock";
import type { Recommendation } from "./types";
import { formatDateLabel } from "./utils";

/** -0.08 → '−8%', 0.2 → '+20%' */
const formatRate = (rate: number) => {
  const pct = Math.round(rate * 100);
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}%`;
};

/** -10 → '−10', 2 → '+2' */
const formatDelta = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;

/**
 * 늘리는 사유(주황): 공휴일, 오늘 완판
 * 줄이는 사유(회색): 비 예보, N일 연속 남음, 이월 재고
 */
const UP_TAGS = new Set(["공휴일", "오늘 완판"]);
const isUpTag = (tag: string) => UP_TAGS.has(tag);

/**
 * ⑧ 내일 생산 추천 (탭)
 * 추천 총량, 날씨·공휴일 조건 카드, 계산 과정, 품목별 추천 수량과 사유 칩을 보여준다.
 */
export default function RecommendScreen() {
  const [rec, setRec] = useState<Recommendation>(MOCK_RECOMMENDATION);
  const [dong, setDong] = useState("서교동");
  const [isExample, setIsExample] = useState(true);
  const [baseClosed, setBaseClosed] = useState(true);

  useEffect(() => {
    if (!API_BASE_URL) return;
    let cancelled = false;
    fetchRecommendation()
      .then(async (res) => {
        if (cancelled) return;
        setRec(res);
        setIsExample(false);
        // 기준일(보통 오늘) 마감 기록이 저장됐는지 → 제목 아래 '마감 기록 반영' 여부
        const day = await fetchSalesRecord(res.base_date);
        if (!cancelled) setBaseClosed(day.is_closed);
      })
      .catch((err) => console.warn("[recommend] 내일 생산 추천 불러오기 실패, mock 데이터로 보여줘요", err));
    fetchStoreDong()
      .then((res) => !cancelled && setDong(res))
      .catch((err) => console.warn("[recommend] 가게 정보 불러오기 실패", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const { conditions } = rec;

  return (
    <main className="pb-6">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-heading-lg font-bold">내일 생산 추천</h1>
        <p className="mt-0.5 text-body-md text-gray-700">
          {formatDateLabel(rec.date)} · {dong} · {formatDateLabel(rec.base_date, false)} 마감 기록{" "}
          {baseClosed ? "반영" : <span className="text-primary-600">반영 전</span>}
        </p>
      </header>

      <div className="px-5">
        {isExample && (
          <p className="mb-3 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-700">
            서버에 연결되지 않아 예시 추천을 보여주고 있어요.
          </p>
        )}

        {rec.is_closed_day ? (
          <section className="rounded-2xl bg-gray-100 px-5 py-6 text-center">
            <p className="text-title-lg font-bold">내일은 쉬는 날이에요</p>
            <p className="mt-1 text-body-md text-gray-700">다음 영업일 추천은 그 전날 마감 후에 보여드릴게요.</p>
          </section>
        ) : (
          <>
            {/* 추천 총량 */}
            <section className="rounded-2xl bg-primary-50 px-5 py-4">
              <p className="text-label-md font-semibold text-primary-600">내일 추천 생산량</p>
              <p className="mt-1 text-heading-md font-bold">
                총 <span className="text-display-sm text-primary-600">{rec.total}</span>개를 추천해요
              </p>
              <p className="mt-1 text-body-md text-gray-700">
                오늘 만든 {rec.today_total}개보다{" "}
                {rec.change === 0 ? "같아요" : `${Math.abs(rec.change)}개 ${rec.change < 0 ? "적어요" : "많아요"}`}.{" "}
                {rec.summary}
              </p>
            </section>

            {/* 조건 카드 */}
            <section aria-label="내일 조건" className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-gray-100 px-4 py-3">
                <p className="text-caption text-gray-700">내일 강수확률</p>
                <p className="mt-1 text-heading-md font-bold">{conditions.pop ?? "–"}%</p>
                <p className={`text-caption font-semibold ${conditions.weather_change < 0 ? "text-primary-600" : "text-gray-700"}`}>
                  {conditions.weather_change === 0 ? "평소와 비슷해요" : `손님 ${formatRate(conditions.weather_change)} 예상`}
                </p>
                {conditions.sources[0] && <p className="text-label-sm text-gray-600">{conditions.sources[0]}</p>}
              </div>
              <div className="rounded-2xl bg-gray-100 px-4 py-3">
                <p className="text-caption text-gray-700">내일</p>
                <p className="mt-1 text-heading-md font-bold">{conditions.is_holiday ? "공휴일" : "평일"}</p>
                <p className={`text-caption font-semibold ${conditions.holiday_change !== 0 ? "text-primary-600" : "text-gray-700"}`}>
                  {conditions.holiday_change === 0 ? "평소와 비슷해요" : `손님 ${formatRate(conditions.holiday_change)} 예상`}
                </p>
                {conditions.sources[1] && <p className="text-label-sm text-gray-600">{conditions.sources[1]}</p>}
              </div>
            </section>

            {/* 계산 과정 */}
            <section className="mt-3 rounded-2xl border border-gray-300 px-4 py-4">
              <h2 className="text-title-sm font-bold">이렇게 계산했어요</h2>
              <ul className="mt-2">
                {rec.steps.map((step, i) => {
                  // 증감률이 없으면(첫 단계) 비워 두고, 예전 응답처럼 아예 없으면 개수 차이로 보여줌
                  const rate = step.change_rate;
                  const delta = i === 0 ? null : step.total - rec.steps[i - 1].total;
                  const changeText = rate !== null && rate !== undefined ? formatRate(rate) : delta !== null ? formatDelta(delta) : null;
                  const unchanged = rate === 0 || (rate == null && delta === 0);
                  return (
                    <li key={step.label} className="flex items-center gap-2 py-1.5 text-body-md">
                      <span className="flex-1 text-gray-800">{step.label}</span>
                      {changeText && (
                        <span className={`w-14 text-right ${unchanged ? "text-gray-500" : "text-primary-600"}`}>
                          {changeText}
                        </span>
                      )}
                      <span className="w-12 text-right font-semibold">{step.total}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-caption text-gray-600">
                판매 기록이 3일보다 적으면 오늘 만든 수량과 판매 속도로 시작하고, 기록이 쌓일수록 같은 요일 평균을 써요.
              </p>
            </section>

            {/* 품목별 추천 */}
            <section className="mt-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-title-lg font-bold">품목별 추천</h2>
                <span className="text-caption text-gray-600">오늘 만든 수량 대비</span>
              </div>
              <ul className="mt-3 space-y-2">
                {rec.items.map((item) => (
                  <li key={item.item_id} className="rounded-2xl bg-gray-100 px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="flex-1 truncate text-title-sm font-semibold">{item.name}</span>
                      <span className="text-caption text-gray-600">오늘 {item.today_made} →</span>
                      <span className="text-heading-sm font-bold">{item.recommended}</span>
                    </div>
                    {item.tags.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <li
                            key={tag}
                            className={`rounded-md px-2 py-0.5 text-caption font-medium ${
                              isUpTag(tag) ? "bg-primary-50 text-primary-600" : "bg-white text-gray-800"
                            }`}
                          >
                            {tag === "이월 재고" && item.carryover_qty > 0 ? `이월 ${item.carryover_qty}개 반영` : tag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
