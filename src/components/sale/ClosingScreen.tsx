"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import { useNow } from "@/hooks/useNow";
import { API_BASE_URL } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { fetchClosingRows, fetchRecommendation, saveClosing } from "./api";
import { MOCK_CLOSING_ROWS } from "./mock";
import { SALE_PATHS } from "./paths";
import type { ClosingChoice, ClosingRow, Recommendation } from "./types";
import { formatDateLabel, parseLeftParam, toDateKey, withTopic } from "./utils";

const defaultChoices = (rows: ClosingRow[]) =>
  Object.fromEntries(rows.map((r) => [r.itemId, r.defaultChoice])) as Record<number, ClosingChoice>;

/**
 * ⑤ 오늘 마감 기록
 * 남은 빵마다 폐기 / 내일 판매를 고른다. 기본값은 보관 기간 기준 (당일 → 폐기, 1~2일 → 내일 판매).
 * 폐기는 '안 팔린 수량'으로, 내일 판매분은 '이월 재고'로 ⑧ 내일 생산 추천에 반영된다.
 */
export default function ClosingScreen({ date, left }: { date?: string; left?: string }) {
  const router = useRouter();
  const now = useNow();
  const leftOverride = useMemo(() => parseLeftParam(left), [left]);

  const [rows, setRows] = useState<ClosingRow[]>(MOCK_CLOSING_ROWS);
  const [choices, setChoices] = useState(() => defaultChoices(MOCK_CLOSING_ROWS));
  const [isExample, setIsExample] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 날짜를 안 넘기면 오늘 (기기 시각 기준이라 처음 그릴 때는 비워 둠)
  const dateKey = date ?? (now ? toDateKey(now) : null);
  const isToday = !date || (now !== null && date === toDateKey(now));

  useEffect(() => {
    if (!API_BASE_URL || !dateKey) return;
    let cancelled = false;

    fetchClosingRows(dateKey, leftOverride)
      .then((res) => {
        if (cancelled || res.rows.every((r) => r.left === null)) return;
        setRows(res.rows);
        setChoices(defaultChoices(res.rows));
        setIsExample(false);
      })
      .catch((err) => console.warn("[closing] 마감 기록 불러오기 실패, mock 데이터로 보여줘요", err));

    return () => {
      cancelled = true;
    };
  }, [dateKey, leftOverride]);

  // 내일 생산 추천 (이 날 마감이 이미 반영됐으면 달라지는 추천 수량을 보여줌)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  useEffect(() => {
    if (!API_BASE_URL) return;
    let cancelled = false;
    fetchRecommendation()
      .then((res) => !cancelled && setRecommendation(res))
      .catch((err) => console.warn("[closing] 내일 추천 불러오기 실패", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const leftRows = rows.filter((r) => r.left !== null && r.left > 0);
  const disposedTotal = leftRows.filter((r) => choices[r.itemId] === "dispose").reduce((s, r) => s + (r.left ?? 0), 0);
  const carryoverTotal = leftRows.filter((r) => choices[r.itemId] === "carryover").reduce((s, r) => s + (r.left ?? 0), 0);
  const carryoverRows = leftRows.filter((r) => choices[r.itemId] === "carryover");
  const hasUnknown = rows.some((r) => r.left === null);

  // 이 날 마감 기록을 반영한 추천이면, 남은 빵 중 추천 수량이 가장 크게 바뀌는 품목 하나를 보여줌
  const leftIds = new Set(leftRows.map((r) => r.itemId));
  const biggestChange =
    recommendation && recommendation.base_date === dateKey
      ? recommendation.items
          .filter((i) => leftIds.has(i.item_id) && i.change !== 0)
          .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]
      : undefined;

  const submit = async () => {
    if (!dateKey) return;
    setSubmitting(true);
    setError(null);
    try {
      if (!isExample) {
        await saveClosing(
          dateKey,
          rows
            .filter((r) => r.left !== null)
            .map((r) => {
              const qty = r.left ?? 0;
              const carry = choices[r.itemId] === "carryover";
              return { item_id: r.itemId, disposed_qty: carry ? 0 : qty, carryover_qty: carry ? qty : 0 };
            }),
        );
      }
      router.push(`${ROUTES.records}?date=${dateKey}`);
    } catch (err) {
      console.warn("[closing] 마감 기록 저장 실패", err);
      setError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  return (
    <main>
      <HeaderBar
        title={isToday ? "오늘 마감 기록" : "마감 기록 수정"}
        // 오늘 마감 흐름이면 ④-1로, ⑥에서 다른 날 기록을 고치러 왔으면 이전 화면으로
        backHref={date ? undefined : SALE_PATHS.remainingCheck}
        right={dateKey && <span className="text-caption font-medium text-gray-600">{formatDateLabel(dateKey, false)}</span>}
      />

      <div className="px-5 pt-2">
        <section>
          <h2 className="text-heading-sm font-bold">남은 빵을 어떻게 처리할까요?</h2>
          <p className="mt-1 text-body-md text-gray-700">
            만든 수량은 오전 진열 촬영과 추가 생산 기록에서, 남은 수량은 마감 때 확인한 수량으로 채워졌어요. 품목마다 처리
            방법만 골라주세요.
          </p>
          {isExample && (
            <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-700">
              아직 남은 수량을 확인하지 않아서 예시 화면을 보여주고 있어요.
            </p>
          )}
        </section>

        {/* 합계 */}
        <section aria-label="처리 합계" className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-primary-50 px-4 py-3">
            <p className="text-caption text-gray-700">폐기</p>
            <p className="text-heading-md font-bold">{disposedTotal}개</p>
          </div>
          <div className="rounded-2xl bg-gray-200 px-4 py-3">
            <p className="text-caption text-gray-700">내일 판매</p>
            <p className="text-heading-md font-bold text-gray-700">{carryoverTotal}개</p>
          </div>
        </section>

        {/* 품목별 */}
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.itemId} className="rounded-2xl bg-gray-100 px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="flex-1 truncate text-title-sm font-semibold">{row.name}</span>
                <span className="text-caption text-gray-600">만든 {row.made}</span>
                <span className="text-label-md font-semibold">남음 {row.left ?? "–"}개</span>
              </div>

              {row.left === null ? (
                <p className="mt-1 text-caption text-gray-600">남은 수량을 아직 확인하지 않았어요</p>
              ) : row.left === 0 ? (
                <p className="mt-1 text-caption font-semibold text-success-300">완판 · 처리할 빵이 없어요</p>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={`${row.name} 처리 방법`}>
                  {(["dispose", "carryover"] as const).map((choice) => {
                    const active = choices[row.itemId] === choice;
                    return (
                      <button
                        key={choice}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setChoices((prev) => ({ ...prev, [row.itemId]: choice }))}
                        className={`h-11 rounded-xl text-label-md transition-colors ${
                          active
                            ? "bg-primary-100 font-semibold text-primary-600"
                            : "border border-gray-400 bg-white font-medium text-gray-800 active:bg-gray-100"
                        }`}
                      >
                        {choice === "dispose" ? "폐기" : "내일 판매"}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* 내일 생산 반영 안내 */}
        <section className="mt-4 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-4">
          <p className="text-label-md font-semibold text-primary-600">내일 생산에 반영돼요</p>
          <p className="mt-2 text-body-md text-gray-800">
            폐기는 &lsquo;안 팔린 수량&rsquo;으로, 내일 판매분은 &lsquo;이월 재고&rsquo;로 계산해요.
            {carryoverRows.length > 0 &&
              ` ${carryoverRows.map((r) => `${r.name} ${r.left}개`).join(", ")}는 내일 추천 수량에서 빼고 계산할게요.`}{" "}
            {biggestChange ? (
              <>
                {withTopic(biggestChange.name)} 내일{" "}
                <b className="font-bold">
                  {biggestChange.today_made}개 → {biggestChange.recommended}개
                </b>
                로 {biggestChange.change < 0 ? "줄여" : "늘려"} 추천할게요.
              </>
            ) : (
              "저장하면 내일 추천 수량이 다시 계산돼요."
            )}
          </p>
          <Link href={ROUTES.recommend} className="mt-2 inline-block text-label-md font-semibold text-primary-600 underline">
            내일 추천 전체 보기
          </Link>
        </section>
      </div>

      <BottomCta
        note={
          error ? (
            <span className="text-error-300">{error}</span>
          ) : hasUnknown && !isExample ? (
            "남은 수량을 확인하지 않은 품목은 저장되지 않아요"
          ) : undefined
        }
      >
        <CtaButton disabled={submitting || !dateKey} onClick={submit}>
          {submitting ? "저장하는 중..." : "마감 기록 저장하기"}
        </CtaButton>
      </BottomCta>
    </main>
  );
}
