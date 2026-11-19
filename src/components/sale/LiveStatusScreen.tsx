"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import { API_BASE_URL } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { formatDuration } from "@/lib/time";
import { fetchLiveStatus, updateDiscountRate } from "./api";
import { MOCK_LIVE } from "./mock";
import { SALE_PATHS } from "./paths";
import type { LiveDiscountItem, LiveStatus } from "./types";
import { withSubject } from "./utils";

/** 현황을 다시 불러오는 간격 */
const REFRESH_MS = 60_000;

/** 느린 품목 → 남은 수량 많은 순 → 완판은 맨 아래 */
const byAttention = (a: LiveDiscountItem, b: LiveDiscountItem) => {
  if (a.slow !== b.slow) return a.slow ? -1 : 1;
  if (a.sold_out !== b.sold_out) return a.sold_out ? 1 : -1;
  return b.left_qty - a.left_qty;
};

/**
 * ④ 마감 세일 현황
 * ③-a·③-b에서 마켓에 올린 뒤 들어온다. 진행률, 세트 현황, 품목별 '세일 전 → 지금', '다음 한 수'를 보여준다.
 */
export default function LiveStatusScreen() {
  const router = useRouter();
  const [live, setLive] = useState<LiveStatus>(MOCK_LIVE);
  // 서버에 오늘 세일이 없어서 예시 화면을 보여주는 중인지
  const [noSaleToday, setNoSaleToday] = useState(false);
  const [raising, setRaising] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      fetchLiveStatus()
        .then((res) => {
          const hasSale = res.discount !== null || res.bundle !== null;
          setNoSaleToday(!hasSale);
          if (hasSale) setLive(res);
        })
        .catch((err) => console.warn("[sale] 마감 세일 현황 불러오기 실패, mock 데이터로 보여줘요", err)),
    [],
  );

  useEffect(() => {
    if (!API_BASE_URL) return;
    let cancelled = false;
    const tick = () => !cancelled && load();
    tick();
    const timer = setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [load]);

  const { discount, bundle } = live;
  const leftQty = discount ? discount.target_qty - discount.sold_qty : 0;
  const items = [...(discount?.items ?? [])].sort(byAttention);

  // 다음 한 수: 품목별 할인율은 안 돼서 세일 전체 할인율을 next_rate로 올림. 느린 품목은 안내 문구에만 씀
  const suggestion = discount?.suggestion ?? null;
  const slowItems = suggestion ? discount!.items.filter((i) => suggestion.item_ids.includes(i.item_id)) : [];
  const firstSlow = slowItems[0];

  const raiseRate = async (rate: number) => {
    if (!discount) return;
    setRaising(true);
    setError(null);
    try {
      if (API_BASE_URL && !noSaleToday) {
        await updateDiscountRate(discount.campaign_id, rate);
        await load();
      } else {
        // 예시 화면: 화면에서만 바꿔 봄
        setLive((prev) => (prev.discount ? { ...prev, discount: { ...prev.discount, discount_rate: rate, suggestion: null } } : prev));
      }
    } catch (err) {
      console.warn("[sale] 할인율 변경 실패", err);
      setError("할인율을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setRaising(false);
    }
  };

  return (
    <main>
      <HeaderBar
        title="마감 세일 현황"
        backHref={ROUTES.home}
      />

      <div className="px-6 pt-2">
        {noSaleToday && (
          <p className="mb-3 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-700">
            오늘 진행 중인 마감 세일이 없어서 예시 화면을 보여주고 있어요.
          </p>
        )}

        {/* 세일 진행 카드 */}
        {discount && (
          <section className="rounded-2xl bg-primary-50 px-5 py-4">
            <div className="flex items-center justify-between text-caption text-gray-700">
              <span>{discount.discount_rate}% 마감 세일 · 마켓 게시 중</span>
              {live.minutes_to_close !== null && <span>마감까지 {formatDuration(live.minutes_to_close)}</span>}
            </div>
            <p className="mt-4 text-body-lg text-gray-800">할인 품목 {discount.target_qty}개 중</p>
            <p className="text-display-sm font-bold">
              <span className="text-primary-600">{discount.sold_qty}개</span> 팔렸어요
            </p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-primary-200"
              role="progressbar"
              aria-valuenow={Math.round(discount.progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-primary-500" style={{ width: `${discount.progress * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-caption text-gray-600">
              <span>판매 속도로 추정 · 마감 때 확인</span>
              <span>남은 {leftQty}개</span>
            </div>
          </section>
        )}

        {/* 세트 현황 */}
        {bundle && (
          <section className="mt-3 flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-title-sm font-semibold">{bundle.name}</p>
              <p className="text-caption text-gray-700">
                {bundle.packs}팩 중 {bundle.sold_packs}팩 판매 · 마켓 게시 중
              </p>
            </div>
            <Link href={ROUTES.saleBundle} className="shrink-0 text-label-md font-semibold text-primary-600 underline">
              수정
            </Link>
          </section>
        )}

        {/* 아직 남은 빵 */}
        {items.length > 0 && (
          <section className="mt-7">
            <h2 className="text-title-lg font-bold">아직 남은 빵</h2>
            <ul className="mt-3 space-y-2">
              {items.map((item) => (
                <li key={item.item_id} className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3">
                  <span className="flex-1 truncate text-title-sm font-semibold">{item.name}</span>
                  <span className="text-body-md text-gray-600">
                    {item.start_qty} →{" "}
                    {item.sold_out ? (
                      <b className="font-semibold text-success-300">완판</b>
                    ) : (
                      <b className="font-semibold text-black">{item.left_qty}개</b>
                    )}
                  </span>
                  {item.slow && (
                    <span className="rounded bg-error-300 px-1.5 py-0.5 text-caption font-semibold text-white">
                      거의 안 팔림
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 다음 한 수 (AI 추천) */}
        {suggestion && firstSlow && (
          <section className="mt-4 rounded-2xl border border-gray-300 px-4 py-4">
            <p className="text-label-md font-semibold text-primary-600">AI 추천</p>
            <p className="mt-2 text-body-lg">
              {withSubject(slowItems.length > 1 ? `${firstSlow.name} 외 ${slowItems.length - 1}개` : firstSlow.name)} 세일
              후에도 {firstSlow.sold_qty}개만 팔렸어요. 할인을 더 올려볼까요?
            </p>
            <button
              type="button"
              disabled={raising}
              onClick={() => raiseRate(suggestion.next_rate)}
              className="mt-3 h-12 w-full rounded-xl border border-gray-400 bg-white text-label-md font-semibold active:bg-gray-100 disabled:opacity-50"
            >
              {raising ? "바꾸는 중..." : `${suggestion.next_rate}%로 올리기`}
            </button>
            {error && <p className="mt-2 text-caption text-error-300">{error}</p>}
          </section>
        )}
      </div>

      <BottomCta note="매장에서 팔린 빵은 마감 때 남은 수량을 확인해 기록돼요">
        <CtaButton onClick={() => router.push(SALE_PATHS.remainingCheck)}>영업 종료하고 남은 빵 확인하기</CtaButton>
      </BottomCta>
    </main>
  );
}
