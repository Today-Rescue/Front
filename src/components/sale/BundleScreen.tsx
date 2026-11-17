"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import Stepper from "@/components/scan/Stepper";
import { API_BASE_URL } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { calculateBundle, calculateBundleLocally, createBundle, fetchDiscountItems, recommendBundles } from "./api";
import LevelBadge from "./LevelBadge";
import { MOCK_BUNDLE_RECOMMENDATIONS, MOCK_RECOMMENDED_RATE, MOCK_SALE_ITEMS } from "./mock";
import SaleMethodTabs from "./SaleMethodTabs";
import type { BundleCalc, BundlePart, BundleRecommendation, SaleItem } from "./types";
import { formatWon, sortByLevel } from "./utils";

/** 추천 세트를 쓰지 않고 직접 구성했을 때 세트 이름 */
const CUSTOM_BUNDLE_NAME = "마감 세트";

/** { itemId: 한 팩에 몇 개 } */
type PerPackMap = Record<number, number>;

const toMap = (parts: BundlePart[]): PerPackMap => Object.fromEntries(parts.map((p) => [p.itemId, p.perPack]));
const toParts = (map: PerPackMap): BundlePart[] =>
  Object.entries(map)
    .filter(([, perPack]) => perPack > 0)
    .map(([itemId, perPack]) => ({ itemId: Number(itemId), perPack }));

/**
 * ③-b 세트 구성
 * 남은 빵을 묶어 세트로 판다. 추천 세트를 보거나('다른 조합 보기') 한 팩 구성을 직접 바꾸면
 * 만들 수 있는 팩 수·묶고 남는 재고를 다시 계산하고, 더 적게 남는 구성이 있으면 알려준다.
 *
 * - 먼저 mock 데이터로 바로 그리고, 서버 응답이 오면 바꾼다 (Render 서버가 깨어나는 데 30~60초 걸려서)
 */
export default function BundleScreen() {
  const router = useRouter();

  /* ---------- 남은 재고 · 추천 세트 ---------- */
  const [items, setItems] = useState<SaleItem[]>(() => sortByLevel(MOCK_SALE_ITEMS));
  // 오늘 재고 스캔 전이라 예시 수량을 보여주는 중인지
  const [exampleStock, setExampleStock] = useState(true);
  const [recommendations, setRecommendations] = useState<BundleRecommendation[]>(MOCK_BUNDLE_RECOMMENDATIONS);

  /* ---------- 세트 구성 ---------- */
  // 보고 있는 추천 세트 번호. 구성을 직접 바꾸면 null
  const [activeRec, setActiveRec] = useState<number | null>(0);
  const [perPack, setPerPack] = useState<PerPackMap>(() => toMap(MOCK_BUNDLE_RECOMMENDATIONS[0].parts));
  // 사장님이 직접 입력한 팩 판매가. null이면 추천가
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!API_BASE_URL) return;
    let cancelled = false;

    fetchDiscountItems(MOCK_RECOMMENDED_RATE)
      .then((res) => {
        if (cancelled || res.every((item) => item.remaining === null)) return;
        setItems(sortByLevel(res));
        setExampleStock(false);
      })
      .catch((err) => console.warn("[sale] 남은 재고 불러오기 실패, mock 데이터로 보여줘요", err));

    recommendBundles()
      .then((res) => {
        if (cancelled || res.length === 0) return;
        setRecommendations(res);
        setActiveRec(0);
        setPerPack(toMap(res[0].parts));
        setCustomPrice(null);
      })
      .catch((err) => console.warn("[sale] 추천 세트 불러오기 실패, mock 데이터로 보여줘요", err));

    return () => {
      cancelled = true;
    };
  }, []);

  const parts = useMemo(() => toParts(perPack), [perPack]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.itemId, item])), [items]);
  const name = activeRec !== null ? recommendations[activeRec].name : CUSTOM_BUNDLE_NAME;

  const applyParts = (next: BundlePart[], recIndex: number | null) => {
    setActiveRec(recIndex);
    setPerPack(toMap(next));
    setCustomPrice(null);
  };

  /** 다음 추천 조합으로 (직접 구성 중이면 첫 번째로) */
  const showNextRecommendation = () => {
    const next = activeRec === null ? 0 : (activeRec + 1) % recommendations.length;
    applyParts(recommendations[next].parts, next);
  };

  const changePerPack = (itemId: number, next: number) => {
    setActiveRec(null);
    setPerPack((prev) => ({ ...prev, [itemId]: next }));
  };

  const removeItem = (itemId: number) => changePerPack(itemId, 0);

  const addItem = (itemId: number) => {
    changePerPack(itemId, 1);
    setAdding(false);
  };

  /* ---------- 계산 (팩 수 · 묶고 남는 재고 · 추천가 · 더 적게 남는 구성) ---------- */
  const [calc, setCalc] = useState<BundleCalc | null>(null);

  useEffect(() => {
    if (parts.length === 0) return;
    const input = parts.map((p) => {
      const item = itemById.get(p.itemId);
      return { ...p, qty: item?.remaining ?? 0, price: item?.price ?? 0 };
    });
    let cancelled = false;

    // 스테퍼를 빠르게 누를 때 요청이 몰리지 않게 잠깐 기다렸다가 계산
    const timer = setTimeout(() => {
      if (!API_BASE_URL) {
        setCalc(calculateBundleLocally(input));
        return;
      }
      calculateBundle(input.map(({ itemId, perPack, qty }) => ({ itemId, perPack, qty })))
        .then((res) => !cancelled && setCalc(res))
        .catch((err) => {
          console.warn("[sale] 세트 계산 실패, 화면에서 계산해요", err);
          if (!cancelled) setCalc(calculateBundleLocally(input));
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [parts, itemById]);

  const shownCalc = parts.length === 0 ? null : calc;
  const recPrice = activeRec !== null ? recommendations[activeRec]?.price : null;
  const suggestedPrice = recPrice ?? shownCalc?.recommendedPrice ?? 0;
  const price = customPrice ?? suggestedPrice;
  // 단품 정가 합계는 등록 가격으로 계산
  const unitTotal = parts.reduce((sum, p) => sum + (itemById.get(p.itemId)?.price ?? 0) * p.perPack, 0);
  const discountPercent = unitTotal > 0 && price > 0 ? Math.round((1 - price / unitTotal) * 100) : null;
  const packs = shownCalc?.packs ?? 0;
  const addableItems = items.filter((item) => !perPack[item.itemId] && (item.remaining ?? 0) > 0);

  /* ---------- 마켓에 올리기 ---------- */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = parts.length > 0 && packs > 0 && price > 0 && !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createBundle({
        name,
        price,
        // 예시 수량은 실제 재고가 아니라서 보내지 않음 (서버가 마지막 재고 스캔 값을 씀)
        items: parts.map((p) => ({
          item_id: p.itemId,
          per_pack: p.perPack,
          qty: exampleStock ? undefined : (itemById.get(p.itemId)?.remaining ?? undefined),
        })),
      });
      router.push(ROUTES.saleStatus);
    } catch (err) {
      console.warn("[sale] 세트 판매 시작 실패", err);
      setError("마켓에 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  const describeParts = (list: BundlePart[]) =>
    list.map((p) => `${itemById.get(p.itemId)?.name ?? "품목"} ${p.perPack}개`).join(" + ");

  return (
    <main>
      <HeaderBar title="판매 방법 정하기" step={{ current: 2, total: 2 }} />

      <div className="px-5 pt-2">
        <SaleMethodTabs active="bundle" />

        {/* 추천 세트 */}
        <section className="mt-6">
          <p className="text-label-md font-semibold text-primary-600">AI 추천 · 재고 많은 품목 조합</p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="flex-1 truncate text-heading-sm font-bold">{name}</h2>
            {recommendations.length > 0 && (
              <button
                type="button"
                onClick={showNextRecommendation}
                className="shrink-0 text-label-md font-semibold text-gray-700 underline"
              >
                다른 조합 보기
              </button>
            )}
          </div>
          {exampleStock && (
            <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-700">
              오늘 남은 재고를 아직 찍지 않아서 예시 수량으로 계산하고 있어요.
            </p>
          )}
        </section>

        {/* 최소 구성 안내 */}
        {shownCalc &&
          (shownCalc.better ? (
            <section className="mt-4 rounded-2xl border border-dashed border-primary-400 px-4 py-3">
              <p className="text-label-md font-semibold text-primary-600">더 적게 남는 구성이 있어요</p>
              <p className="mt-0.5 text-body-md text-gray-800">
                {describeParts(shownCalc.better.parts)} · {shownCalc.better.packs}팩 · {shownCalc.better.leftover}개 남음
              </p>
              <button
                type="button"
                onClick={() => applyParts(shownCalc.better!.parts, null)}
                className="mt-2 h-10 rounded-lg bg-primary-50 px-4 text-label-md font-semibold text-primary-600 active:bg-primary-100"
              >
                적용
              </button>
            </section>
          ) : (
            <section className="mt-4 rounded-2xl bg-primary-50 px-4 py-3">
              <p className="text-label-md font-semibold text-primary-600">남는 재고 최소 구성 적용 중</p>
              <p className="mt-0.5 text-caption text-gray-700">지금 재고로 가장 적게 남는 조합이에요.</p>
            </section>
          ))}

        {/* 한 팩 구성 */}
        <section aria-label="한 팩 구성" className="mt-6">
          <p className="text-label-md font-semibold">한 팩 구성</p>
          <ul className="mt-2 rounded-2xl bg-gray-100 px-4">
            {parts.map((p) => {
              const item = itemById.get(p.itemId);
              if (!item) return null;
              return (
                <li key={p.itemId} className="flex items-center gap-2 border-b border-gray-300 py-2 last:border-0">
                  <button
                    type="button"
                    onClick={() => removeItem(p.itemId)}
                    aria-label={`${item.name} 빼기`}
                    className="-ml-1 flex size-7 shrink-0 items-center justify-center rounded-full text-gray-500 active:bg-gray-200"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5">
                      <span className="truncate text-body-lg font-semibold">{item.name}</span>
                      <LevelBadge level={item.level} />
                    </p>
                    <p className="text-caption text-gray-600">재고 {item.remaining ?? "–"}개</p>
                  </div>
                  <Stepper
                    value={p.perPack}
                    onChange={(next) => changePerPack(p.itemId, next)}
                    min={1}
                    max={item.remaining ?? undefined}
                    size="sm"
                    label={`${item.name} 한 팩 수량`}
                  />
                </li>
              );
            })}
            {parts.length === 0 && (
              <li className="py-4 text-center text-body-md text-gray-600">세트에 넣을 빵을 추가해 주세요</li>
            )}
          </ul>

          {/* 품목 추가 */}
          {addableItems.length > 0 && (
            <>
              <button
                type="button"
                aria-expanded={adding}
                onClick={() => setAdding((v) => !v)}
                className="mt-2 flex h-11 w-full items-center justify-center gap-1 rounded-xl border border-gray-300 text-label-md font-semibold text-gray-800 active:bg-gray-100"
              >
                <span aria-hidden className="text-primary-500">＋</span>품목 추가
              </button>
              {adding && (
                <ul className="mt-2 rounded-2xl border border-gray-300 px-4">
                  {addableItems.map((item) => (
                    <li key={item.itemId} className="border-b border-gray-200 last:border-0">
                      <button
                        type="button"
                        onClick={() => addItem(item.itemId)}
                        className="flex h-12 w-full items-center gap-2 text-left"
                      >
                        <span className="flex-1 truncate text-body-lg">{item.name}</span>
                        <LevelBadge level={item.level} />
                        <span className="text-caption text-gray-600">재고 {item.remaining}개</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {/* 팩 판매가 */}
        <section className="mt-6">
          <label htmlFor="bundle-price" className="text-label-md font-semibold">
            팩 판매가
          </label>
          <div className="mt-2 flex h-14 items-center rounded-xl border border-gray-300 px-4 focus-within:border-primary-500">
            <input
              id="bundle-price"
              inputMode="numeric"
              value={price > 0 ? price.toLocaleString("ko-KR") : ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setCustomPrice(digits === "" ? 0 : Number(digits));
              }}
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent text-right text-heading-sm font-bold outline-none"
            />
            <span className="ml-1 text-title-lg font-semibold">원</span>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-caption text-gray-600">
            <span>단품 정가 합계 {formatWon(unitTotal)}</span>
            {discountPercent !== null && discountPercent > 0 && (
              <b className="font-semibold text-primary-600">{discountPercent}% 할인</b>
            )}
            {customPrice !== null && suggestedPrice > 0 && customPrice !== suggestedPrice && (
              <button type="button" onClick={() => setCustomPrice(null)} className="font-semibold text-primary-600 underline">
                추천가 {formatWon(suggestedPrice)}
              </button>
            )}
          </p>
        </section>

        {/* 요약 */}
        <section aria-label="세트 계산 결과" className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-primary-50 px-4 py-3">
            <p className="text-caption text-gray-700">만들 수 있는 팩</p>
            <p className="text-heading-md font-bold">{shownCalc ? `${packs}팩` : "–"}</p>
          </div>
          <div className="rounded-2xl bg-gray-100 px-4 py-3">
            <p className="text-caption text-gray-700">묶고 남는 재고</p>
            <p className="text-heading-md font-bold">{shownCalc ? `${shownCalc.leftover}개` : "–"}</p>
            {shownCalc && parts.length > 0 && (
              <p className="mt-0.5 text-caption text-gray-600">
                {parts
                  .map((p) => `${itemById.get(p.itemId)?.name ?? "품목"} ${shownCalc.leftoverByItem[p.itemId] ?? 0}`)
                  .join(" · ")}
              </p>
            )}
          </div>
        </section>
      </div>

      <BottomCta note={error && <span className="text-error-300">{error}</span>}>
        <CtaButton disabled={!canSubmit} onClick={submit}>
          {parts.length === 0
            ? "세트에 넣을 빵을 골라 주세요"
            : submitting
              ? "올리는 중..."
              : packs === 0
                ? "남은 빵이 부족해 팩을 만들 수 없어요"
                : price <= 0
                  ? "팩 판매가를 입력해 주세요"
                  : `${packs}팩 마켓에 올리기`}
        </CtaButton>
      </BottomCta>
    </main>
  );
}
