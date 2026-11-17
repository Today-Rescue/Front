"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import { API_BASE_URL } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { createDiscount, fetchDiscountItems } from "./api";
import { MOCK_RECOMMENDED_RATE, MOCK_SALE_ITEMS } from "./mock";
import SaleMethodTabs from "./SaleMethodTabs";
import LevelBadge from "./LevelBadge";
import { DISCOUNT_RATES, type DiscountRate, type SaleItem } from "./types";
import { sortByLevel } from "./utils";

const defaultSelection = (items: SaleItem[]) =>
  new Set(items.filter((item) => item.defaultSelected).map((item) => item.itemId));

/**
 * ③-a 일괄 할인
 * ② 스캔 결과 확인에서 '일괄 할인'을 누르면 들어온다.
 * 할인율과 품목을 고르면 앱 안의 오늘구조대 마켓에 한 번에 올린다.
 *
 * - 먼저 mock 데이터로 바로 그리고, 서버 응답이 오면 바꾼다 (Render 서버가 깨어나는 데 30~60초 걸려서)
 */
export default function DiscountScreen() {
  const router = useRouter();

  const [items, setItems] = useState<SaleItem[]>(() => sortByLevel(MOCK_SALE_ITEMS));
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => defaultSelection(MOCK_SALE_ITEMS));
  const [rate, setRate] = useState<DiscountRate>(MOCK_RECOMMENDED_RATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!API_BASE_URL) return;
    let cancelled = false;

    fetchDiscountItems(MOCK_RECOMMENDED_RATE)
      .then((res) => {
        if (cancelled) return;
        setItems(sortByLevel(res));
        setSelectedIds(defaultSelection(res));
      })
      .catch((err) => console.warn("[sale] 할인 품목 불러오기 실패, mock 데이터로 보여줘요", err));

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedItems = items.filter((item) => selectedIds.has(item.itemId));
  const selectedCount = selectedItems.reduce((sum, item) => sum + (item.remaining ?? 0), 0);
  // 오늘 재고 스캔 전이면 남은 수량·위험도가 없음
  const beforeScan = items.every((item) => item.remaining === null);

  const toggle = (itemId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createDiscount({ discount_rate: rate, item_ids: selectedItems.map((item) => item.itemId) });
      router.push(ROUTES.saleStatus);
    } catch (err) {
      console.warn("[sale] 일괄 할인 시작 실패", err);
      setError("마켓에 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  return (
    <main>
      <HeaderBar title="판매 방법 정하기" step={{ current: 2, total: 2 }} />

      <div className="px-5 pt-2">
        <SaleMethodTabs active="discount" />

        {/* 안내 */}
        <section className="mt-6">
          <p className="text-label-md font-semibold text-primary-600">AI 추천 · 위험·주의 품목 자동 선택</p>
          <h2 className="mt-1 text-heading-sm font-bold">마감 {rate}% 일괄 할인</h2>
          <p className="mt-1 text-body-md text-gray-700">
            할인율과 품목을 고르면 앱 안의 오늘구조대 마켓에 한 번에 올려요.
          </p>
        </section>

        {/* 할인율 */}
        <section aria-label="할인율" className="mt-6">
          <p className="text-label-md font-semibold">할인율</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {DISCOUNT_RATES.map((r) => {
              const isActive = r === rate;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setRate(r)}
                  className={`h-12 rounded-xl border text-label-lg transition-colors ${
                    isActive
                      ? "border-primary-500 bg-primary-50 font-semibold text-primary-600"
                      : "border-gray-300 bg-white font-medium text-black active:bg-gray-100"
                  }`}
                >
                  {r}%
                </button>
              );
            })}
          </div>
        </section>

        {/* 적용 품목 */}
        <section aria-label="적용 품목" className="mt-6">
          <p className="text-label-md font-semibold">적용 품목</p>
          {beforeScan && (
            <p className="mt-1 text-caption text-gray-600">
              오늘 남은 재고를 아직 찍지 않아서 위험·주의 품목을 고르지 못했어요. 할인할 품목을 직접 골라 주세요.
            </p>
          )}
          <ul className="mt-2 rounded-2xl bg-gray-100 px-4">
            {items.map((item) => (
              <li key={item.itemId} className="border-b border-gray-300 last:border-0">
                <label className="flex h-14 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.itemId)}
                    onChange={() => toggle(item.itemId)}
                    className="peer sr-only"
                  />
                  <CheckBox checked={selectedIds.has(item.itemId)} />
                  <span className="flex-1 truncate text-body-lg">{item.name}</span>
                  <LevelBadge level={item.level} />
                  <span className="w-10 text-right text-caption text-gray-600">
                    {item.remaining === null ? "–" : `${item.remaining}개`}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        {/* 요약 */}
        <section aria-label="할인 요약" className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-primary-50 px-4 py-3">
            <p className="text-caption text-gray-700">할인 적용</p>
            <p className="text-heading-md font-bold">{beforeScan ? "–" : `${selectedCount}개`}</p>
          </div>
          <div className="rounded-2xl bg-gray-100 px-4 py-3">
            <p className="text-caption text-gray-700">할인 품목</p>
            <p className="text-heading-md font-bold">{selectedItems.length}종</p>
          </div>
        </section>
      </div>

      <BottomCta note={error && <span className="text-error-300">{error}</span>}>
        <CtaButton disabled={selectedItems.length === 0 || submitting} onClick={submit}>
          {selectedItems.length === 0
            ? "할인할 품목을 골라 주세요"
            : submitting
              ? "올리는 중..."
              : `${rate}% 할인 마켓에 올리기`}
        </CtaButton>
      </BottomCta>
    </main>
  );
}

/** 주황 사각 체크박스 (실제 입력은 옆의 숨긴 input이 받음) */
function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300 ${
        checked ? "border-primary-500 bg-primary-500" : "border-gray-500 bg-white"
      }`}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L19 8" />
        </svg>
      )}
    </span>
  );
}
