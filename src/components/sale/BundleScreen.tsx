"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import Stepper from "@/components/scan/Stepper";
import { API_BASE_URL } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { calculateBundle, calculateBundleLocally, createBundle, fetchDiscountItems, recommendBundles } from "./api";
import { MOCK_BUNDLE_RECOMMENDATIONS, MOCK_RECOMMENDED_RATE, MOCK_SALE_ITEMS } from "./mock";
import SaleMethodTabs from "./SaleMethodTabs";
import type { BundleCalc, BundlePart, BundleRecommendation, SaleItem } from "./types";
import { formatWon, sortByLevel } from "./utils";

/** 팩 가격을 한 번에 바꾸는 단위(원) */
const PRICE_STEP = 500;

/** { itemId: 한 팩에 몇 개 } */
type PerPackMap = Record<number, number>;

const toMap = (parts: BundlePart[]): PerPackMap => Object.fromEntries(parts.map((p) => [p.itemId, p.perPack]));
const toParts = (map: PerPackMap): BundlePart[] =>
  Object.entries(map)
    .filter(([, perPack]) => perPack > 0)
    .map(([itemId, perPack]) => ({ itemId: Number(itemId), perPack }));

/**
 * ③-b 세트 구성
 * 남은 빵을 묶어 세트로 판다. 추천 세트를 고르거나 한 팩 구성을 직접 바꾸면
 * 만들 수 있는 팩 수·남는 빵을 다시 계산하고, 더 적게 남는 구성이 있으면 알려준다.
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
  // 고른 추천 세트 번호. 구성을 직접 바꾸면 null
  const [activeRec, setActiveRec] = useState<number | null>(0);
  const [name, setName] = useState(MOCK_BUNDLE_RECOMMENDATIONS[0].name);
  const [perPack, setPerPack] = useState<PerPackMap>(() => toMap(MOCK_BUNDLE_RECOMMENDATIONS[0].parts));
  // 사장님이 직접 정한 팩 가격. null이면 추천가
  const [customPrice, setCustomPrice] = useState<number | null>(null);

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
        setName(res[0].name);
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

  const chooseRecommendation = (index: number) => {
    const rec = recommendations[index];
    setActiveRec(index);
    setName(rec.name);
    setPerPack(toMap(rec.parts));
    setCustomPrice(null);
  };

  const changePerPack = (itemId: number, next: number) => {
    setActiveRec(null);
    setPerPack((prev) => ({ ...prev, [itemId]: next }));
  };

  /* ---------- 계산 (팩 수 · 남는 빵 · 추천가 · 더 적게 남는 구성) ---------- */
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
  const price = customPrice ?? recPrice ?? shownCalc?.recommendedPrice ?? 0;
  const discountPercent =
    shownCalc && shownCalc.unitTotal > 0 ? Math.round((1 - price / shownCalc.unitTotal) * 100) : null;
  const packs = shownCalc?.packs ?? 0;

  /* ---------- 마켓에 올리기 ---------- */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = parts.length > 0 && packs > 0 && name.trim() !== "" && price > 0 && !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createBundle({
        name: name.trim(),
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

        {/* 안내 */}
        <section className="mt-6">
          <p className="text-label-md font-semibold text-primary-600">AI 추천 · 남는 빵이 적은 조합</p>
          <h2 className="mt-1 text-heading-sm font-bold">남은 빵을 세트로 묶어 팔아요</h2>
          <p className="mt-1 text-body-md text-gray-700">
            한 팩 구성과 가격을 정하면 오늘구조대 마켓에 세트로 올려요.
          </p>
          {exampleStock && (
            <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-700">
              오늘 남은 재고를 아직 찍지 않아서 예시 수량으로 계산하고 있어요.
            </p>
          )}
        </section>

        {/* 추천 세트 */}
        <section aria-label="추천 세트" className="mt-6">
          <p className="text-label-md font-semibold">추천 세트</p>
          <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
            {recommendations.map((rec, i) => {
              const isActive = i === activeRec;
              return (
                <button
                  key={`${rec.name}-${i}`}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => chooseRecommendation(i)}
                  className={`shrink-0 rounded-xl border px-4 py-2.5 text-left transition-colors ${
                    isActive ? "border-primary-500 bg-primary-50" : "border-gray-300 bg-white active:bg-gray-100"
                  }`}
                >
                  <p className={`text-label-md font-semibold ${isActive ? "text-primary-600" : "text-black"}`}>
                    {rec.name}
                  </p>
                  <p className="mt-0.5 text-caption text-gray-600">{describeParts(rec.parts)}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 세트 이름 */}
        <section className="mt-6">
          <label htmlFor="bundle-name" className="text-label-md font-semibold">
            세트 이름
          </label>
          <input
            id="bundle-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="예: 퇴근길 든든 팩"
            className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-4 text-body-lg outline-none focus:border-primary-500"
          />
        </section>

        {/* 한 팩 구성 */}
        <section aria-label="한 팩 구성" className="mt-6">
          <p className="text-label-md font-semibold">한 팩 구성</p>
          <ul className="mt-2 rounded-2xl bg-gray-100 px-4">
            {items.map((item) => {
              const count = perPack[item.itemId] ?? 0;
              const left = shownCalc?.leftoverByItem[item.itemId];
              return (
                <li key={item.itemId} className="flex items-center gap-2 border-b border-gray-300 py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-body-lg ${count > 0 ? "font-semibold" : "text-gray-700"}`}>
                      {item.name}
                    </p>
                    <p className="text-caption text-gray-600">
                      남은 {item.remaining ?? "–"}개
                      {count > 0 && left !== undefined && <> · 팩 만들고 {left}개 남음</>}
                    </p>
                  </div>
                  <Stepper
                    value={count}
                    onChange={(next) => changePerPack(item.itemId, next)}
                    min={0}
                    max={item.remaining ?? undefined}
                    size="sm"
                    label={`${item.name} 한 팩 수량`}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        {/* 팩 가격 */}
        <section aria-label="팩 가격" className="mt-6">
          <div className="flex items-baseline justify-between">
            <p className="text-label-md font-semibold">팩 가격</p>
            {shownCalc && shownCalc.unitTotal > 0 && (
              <p className="text-caption text-gray-600">
                정가 <span className="line-through">{formatWon(shownCalc.unitTotal)}</span>
                {discountPercent !== null && discountPercent > 0 && (
                  <b className="ml-1 font-semibold text-primary-600">{discountPercent}% 할인</b>
                )}
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-gray-100 px-2 py-2">
            <PriceButton
              label="팩 가격 내리기"
              disabled={price <= PRICE_STEP}
              onClick={() => setCustomPrice(Math.max(PRICE_STEP, price - PRICE_STEP))}
            >
              <path d="M7 12h10" />
            </PriceButton>
            <output aria-live="polite" className="text-heading-md font-bold tabular-nums">
              {formatWon(price)}
            </output>
            <PriceButton label="팩 가격 올리기" onClick={() => setCustomPrice(price + PRICE_STEP)}>
              <path d="M12 7v10M7 12h10" />
            </PriceButton>
          </div>
          {customPrice !== null && shownCalc && (
            <button
              type="button"
              onClick={() => setCustomPrice(null)}
              className="mt-2 text-caption font-semibold text-primary-600"
            >
              추천가 {formatWon(recPrice ?? shownCalc.recommendedPrice)}로 되돌리기
            </button>
          )}
        </section>

        {/* 계산 결과 */}
        <section aria-label="세트 계산 결과" className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-primary-50 px-4 py-3">
            <p className="text-caption text-gray-700">만들 수 있는 팩</p>
            <p className="text-heading-md font-bold">{shownCalc ? `${packs}팩` : "–"}</p>
          </div>
          <div className="rounded-2xl bg-gray-100 px-4 py-3">
            <p className="text-caption text-gray-700">세트 후 남는 빵</p>
            <p className="text-heading-md font-bold">{shownCalc ? `${shownCalc.leftover}개` : "–"}</p>
          </div>
        </section>

        {/* 더 적게 남는 구성 */}
        {shownCalc?.better && (
          <section className="mt-3 rounded-2xl border border-primary-300 bg-white px-4 py-3">
            <p className="text-label-md font-semibold text-primary-600">
              이렇게 바꾸면 {shownCalc.better.leftover}개만 남아요
            </p>
            <p className="mt-0.5 text-body-md text-gray-800">
              {describeParts(shownCalc.better.parts)} · {shownCalc.better.packs}팩
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveRec(null);
                setPerPack(toMap(shownCalc.better!.parts));
                setCustomPrice(null);
              }}
              className="mt-2 h-10 rounded-lg bg-primary-50 px-4 text-label-md font-semibold text-primary-600 active:bg-primary-100"
            >
              이 구성으로 바꾸기
            </button>
          </section>
        )}
      </div>

      <BottomCta note={error && <span className="text-error-300">{error}</span>}>
        <CtaButton disabled={!canSubmit} onClick={submit}>
          {parts.length === 0
            ? "세트에 넣을 빵을 골라 주세요"
            : submitting
              ? "올리는 중..."
              : packs === 0
                ? "남은 빵이 부족해 팩을 만들 수 없어요"
                : `${name.trim() || "세트"} ${packs}팩 마켓에 올리기`}
        </CtaButton>
      </BottomCta>
    </main>
  );
}

function PriceButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border border-gray-300 bg-white active:bg-gray-100 disabled:opacity-40"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
