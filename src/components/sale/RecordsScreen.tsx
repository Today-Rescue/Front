"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNow } from "@/hooks/useNow";
import { API_BASE_URL } from "@/lib/api";
import { fetchCalendar, fetchSalesRecord } from "./api";
import { MOCK_CALENDAR, MOCK_SALES_RECORD } from "./mock";
import { SALE_PATHS } from "./paths";
import type { CalendarDay, SalesRecordDay } from "./types";
import { formatDateLabel, fromDateKey, toDateKey, weekdayOf } from "./utils";

/** 막대·범례 색 (정가 판매, 할인 판매, 내일 판매, 폐기) */
const SEGMENTS = [
  { key: "regular_sold", label: "정가 판매", color: "bg-gray-800" },
  { key: "discount_sold", label: "할인 판매", color: "bg-primary-500" },
  { key: "carryover", label: "내일 판매", color: "bg-gray-500" },
  { key: "disposed", label: "폐기", color: "bg-gray-300" },
] as const;

/** 그 달 1일부터 마지막 날(이번 달이면 오늘)까지 날짜 목록 */
function daysOfMonth(key: string, today: string) {
  const first = fromDateKey(key);
  const days: string[] = [];
  for (let d = new Date(first.getFullYear(), first.getMonth(), 1); d.getMonth() === first.getMonth(); d.setDate(d.getDate() + 1)) {
    const k = toDateKey(d);
    if (k > today) break;
    days.push(k);
  }
  return days;
}

/** 표의 '남은 빵' 칸 */
function leftLabel(item: SalesRecordDay["items"][number]) {
  if (item.sold_out || item.left === 0) return "완판";
  if (item.left === null) return "–";
  const parts = [];
  if (item.disposed) parts.push(`폐기 ${item.disposed}`);
  if (item.carryover) parts.push(`이월 ${item.carryover}`);
  return parts.length > 0 ? parts.join(" · ") : `남음 ${item.left}`;
}

/**
 * ⑥ 판매 기록 (탭)
 * 날짜 칩을 가로로 넘겨 하루를 고르면, 하루 요약(정가·할인·내일 판매·폐기)과 품목별 표를 보여준다.
 */
export default function RecordsScreen({ date }: { date?: string }) {
  const router = useRouter();
  const now = useNow();
  const today = now ? toDateKey(now) : null;

  const [picked, setPicked] = useState<string | undefined>(date);
  const selected = picked ?? today;
  const month = selected?.slice(0, 7) ?? null;

  const [calendar, setCalendar] = useState<CalendarDay[]>(MOCK_CALENDAR);
  const [record, setRecord] = useState<SalesRecordDay>(MOCK_SALES_RECORD);
  const [isExample, setIsExample] = useState(true);

  useEffect(() => {
    if (!API_BASE_URL || !month) return;
    let cancelled = false;
    fetchCalendar(month)
      .then((res) => !cancelled && setCalendar(res))
      .catch((err) => console.warn("[records] 달력 불러오기 실패", err));
    return () => {
      cancelled = true;
    };
  }, [month]);

  useEffect(() => {
    if (!API_BASE_URL || !selected) return;
    let cancelled = false;
    fetchSalesRecord(selected)
      .then((res) => {
        if (cancelled) return;
        setRecord(res);
        setIsExample(false);
      })
      .catch((err) => console.warn("[records] 판매 기록 불러오기 실패, mock 데이터로 보여줘요", err));
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // 고른 날짜 칩이 보이도록 가로 스크롤
  const selectedChip = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedChip.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selected, today]);

  const recordDays = new Set(calendar.map((d) => d.date));
  const days = selected && today ? daysOfMonth(selected, today) : [];
  const { total } = record;
  const barTotal = SEGMENTS.reduce((sum, s) => sum + total[s.key], 0);
  const shownDate = isExample ? record.date : selected;

  return (
    <main className="pb-6">
      <header className="flex items-baseline justify-between px-5 pt-6 pb-4">
        <h1 className="text-heading-lg font-bold">판매 기록</h1>
        {month && (
          <span className="text-body-md text-gray-700">
            {month.slice(0, 4)}년 {Number(month.slice(5))}월
          </span>
        )}
      </header>

      {/* 날짜 칩 */}
      <nav aria-label="날짜 선택" className="mx-5 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const active = d === selected;
          const hasRecord = recordDays.has(d) || d === today;
          return (
            <button
              key={d}
              ref={active ? selectedChip : undefined}
              type="button"
              aria-pressed={active}
              disabled={!hasRecord}
              onClick={() => setPicked(d)}
              // 한 화면에 7개(일주일)가 보이도록: (가로 - 칩 사이 간격 6개) / 7
              style={{ width: "calc((100% - 48px) / 7)" }}
              className={`flex h-16 shrink-0 flex-col items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${
                active ? "bg-primary-500 text-white" : "bg-gray-100 text-black active:bg-gray-200"
              }`}
            >
              <span className={`text-caption ${active ? "text-white" : "text-gray-600"}`}>{weekdayOf(d)}</span>
              <span className="text-title-lg font-bold">{fromDateKey(d).getDate()}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-5">
        {isExample && (
          <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-700">
            서버에 연결되지 않아 예시 기록을 보여주고 있어요.
          </p>
        )}

        {/* 하루 요약 */}
        <section className="mt-4 rounded-2xl bg-gray-100 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <p className="text-label-md font-semibold">{shownDate && formatDateLabel(shownDate)}</p>
            <p className="text-caption text-gray-600">
              총 {record.items.length}품목 · {record.is_closed ? "마감 기록 완료" : "마감 기록 전"}
            </p>
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-body-md text-gray-700">만든 수량</span>
            <span className="text-display-sm font-bold">{total.made}개</span>
          </p>

          {barTotal > 0 && (
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-gray-200" aria-hidden>
              {SEGMENTS.map((s) => (
                <div key={s.key} className={s.color} style={{ width: `${(total[s.key] / barTotal) * 100}%` }} />
              ))}
            </div>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
            {SEGMENTS.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 text-body-md">
                <span aria-hidden className={`size-2.5 rounded-sm ${s.color}`} />
                <dt className="flex-1 text-gray-700">{s.label}</dt>
                <dd className="font-semibold">{total[s.key]}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 품목별 기록 */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-title-lg font-bold">품목별 기록</h2>
            <span className="text-caption text-gray-600">단위: 개</span>
          </div>
          <div className="mt-3 rounded-2xl bg-gray-100 px-4 py-2">
            <table className="w-full text-body-md">
              <thead>
                <tr className="border-b border-gray-300 text-caption text-gray-600">
                  <th className="py-2 text-left font-medium">품목</th>
                  <th className="w-10 py-2 text-right font-medium">만든</th>
                  <th className="w-10 py-2 text-right font-medium">정가</th>
                  <th className="w-10 py-2 text-right font-medium">할인</th>
                  <th className="w-20 py-2 text-right font-medium">남은 빵</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((item) => (
                  <tr key={item.item_id} className="border-b border-gray-300 last:border-0">
                    <td className="max-w-0 truncate py-3 font-semibold">{item.name}</td>
                    <td className="py-3 text-right text-gray-700">{item.made}</td>
                    <td className="py-3 text-right text-gray-700">{item.regular_sold ?? "–"}</td>
                    <td className="py-3 text-right font-semibold text-primary-600">{item.discount_sold}</td>
                    <td className={`py-3 text-right font-semibold ${item.disposed ? "text-error-300" : ""}`}>
                      {leftLabel(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <button
          type="button"
          disabled={!selected}
          onClick={() => router.push(`${SALE_PATHS.closing}?date=${isExample ? record.date : selected}`)}
          className="mt-4 h-14 w-full rounded-2xl bg-gray-100 text-label-lg font-semibold active:bg-gray-200"
        >
          기록 수정하기
        </button>
      </div>
    </main>
  );
}
