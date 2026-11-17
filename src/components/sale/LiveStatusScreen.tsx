"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import { useNow } from "@/hooks/useNow";
import { API_BASE_URL } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { formatDuration } from "@/lib/time";
import { fetchLiveStatus, updateDiscountRate } from "./api";
import { MOCK_LIVE } from "./mock";
import { SALE_PATHS } from "./paths";
import type { LiveDiscountItem, LiveStatus } from "./types";
import { minutesUntil, withSubject } from "./utils";

/** 현황을 다시 불러오는 간격 */
const REFRESH_MS = 60_000;
/** 시작 수량 대비 이만큼도 안 팔렸으면 '거의 안 팔림' */
const SLOW_RATIO = 0.3;
const MAX_RATE = 50;

const soldOf = (item: LiveDiscountItem) => item.startQty - item.nowQty;
const isSlow = (item: LiveDiscountItem) =>
  item.nowQty > 0 && item.startQty > 0 && soldOf(item) / item.startQty < SLOW_RATIO;

/**
 * ④ 마감 세일 현황
 * ③-a·③-b에서 마켓에 올린 뒤 들어온다. 진행률, 세트 현황, 품목별 '세일 전 → 지금', '다음 한 수'를 보여준다.
 */
export default function LiveStatusScreen() {
  const router = useRouter();
  const now = useNow();
  const [live, setLive] = useState<LiveStatus>(MOCK_LIVE);
  // 서버에 오늘 세일이 없어서 예시 화면을 보여주는 중인지
  const [noSaleToday, setNoSaleToday] = useState(false);
  const [raising, setRaising] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!API_BASE_URL) return;
    let cancelled = false;

    const load = () =>
      fetchLiveStatus()
        .then((res) => {
          if (cancelled) return;
          if (res) setLive(res);
          setNoSaleToday(res === null);
        })
        .catch((err) => console.warn("[sale] 마감 세일 현황 불러오기 실패, mock 데이터로 보여줘요", err));

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const { discount, bundle } = live;
  const items = discount?.items ?? [];
  const totalStart = items.reduce((sum, i) => sum + i.startQty, 0);
  const totalNow = items.reduce((sum, i) => sum + i.nowQty, 0);
  const totalSold = totalStart - totalNow;
  const progress = totalStart > 0 ? totalSold / totalStart : 0;

  // 거의 안 팔린 품목 → 남은 수량 많은 순 → 완판은 맨 아래
  const sortedItems = [...items].sort((a, b) => {
    if (isSlow(a) !== isSlow(b)) return isSlow(a) ? -1 : 1;
    if ((a.nowQty === 0) !== (b.nowQty === 0)) return a.nowQty === 0 ? 1 : -1;
    return b.nowQty - a.nowQty;
  });

  // 다음 한 수: 가장 안 팔린 품목 하나로 할인율 올리기 제안
  // TODO(B): campaigns/live 의 '느린 품목과 할인율 올리기 제안'을 받으면 그 값으로 바꾸기
  // TODO(B): 화면 설명은 '해당 품목' 할인율 변경인데, PATCH /campaigns/{id} 는 세일 전체 할인율만 바꿀 수 있음 (백엔드 확인)
  const slowest = items.filter(isSlow).sort((a, b) => soldOf(a) / a.startQty - soldOf(b) / b.startQty)[0];
  const nextRate = discount ? Math.min(MAX_RATE, discount.rate + 20) : null;
  const suggestion = slowest && discount && nextRate && nextRate > discount.rate ? { item: slowest, rate: nextRate } : null;

  const raiseRate = async (rate: number) => {
    if (!discount) return;
    setRaising(true);
    setError(null);
    try {
      if (API_BASE_URL && discount.campaignId) await updateDiscountRate(discount.campaignId, rate);
      setLive((prev) => (prev.discount ? { ...prev, discount: { ...prev.discount, rate } } : prev));
    } catch (err) {
      console.warn("[sale] 할인율 변경 실패", err);
      setError("할인율을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setRaising(false);
    }
  };

  const leftMinutes = discount?.endsAt && now ? minutesUntil(discount.endsAt, now) : null;

  return (
    <main>
      <HeaderBar
        title="마감 세일 현황"
        backHref={ROUTES.home}
        right={
          <span className="flex items-center gap-1.5 text-label-md font-semibold text-primary-600">
            <span aria-hidden className="size-2 rounded-full bg-primary-500" />
            진행 중
          </span>
        }
      />

      <div className="px-5 pt-2">
        {noSaleToday && (
          <p className="mb-3 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-700">
            오늘 진행 중인 마감 세일이 없어서 예시 화면을 보여주고 있어요.
          </p>
        )}

        {/* 진행률 */}
        {discount && (
          <section className="rounded-2xl bg-primary-50 px-5 py-4">
            <div className="flex items-center justify-between text-caption text-gray-700">
              <span>{discount.rate}% 마감 세일 · 마켓 게시 중</span>
              {leftMinutes !== null && <span>마감까지 {formatDuration(leftMinutes)}</span>}
            </div>
            <p className="mt-4 text-body-lg text-gray-800">할인 품목 {totalStart}개 중</p>
            <p className="text-display-sm font-bold">
              <span className="text-primary-600">{totalSold}개</span> 팔렸어요
            </p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-primary-200"
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-primary-500" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-caption text-gray-600">
              <span>판매 속도로 추정 · 마감 때 확인</span>
              <span>남은 {totalNow}개</span>
            </div>
          </section>
        )}

        {/* 세트 현황 */}
        {bundle && (
          <section className="mt-3 flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-4">
            <span aria-hidden className="size-10 shrink-0 rounded-lg bg-primary-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-title-sm font-semibold">{bundle.name}</p>
              <p className="text-caption text-gray-700">
                {bundle.totalPacks !== null ? `${bundle.totalPacks}팩 중 ` : ""}
                {bundle.soldPacks}팩 판매 · 마켓 게시 중
              </p>
            </div>
            <Link href={ROUTES.saleBundle} className="shrink-0 text-label-md font-semibold text-primary-600 underline">
              수정
            </Link>
          </section>
        )}

        {/* 아직 남은 빵 */}
        {sortedItems.length > 0 && (
          <section className="mt-7">
            <h2 className="text-title-lg font-bold">아직 남은 빵</h2>
            <ul className="mt-3 space-y-2">
              {sortedItems.map((item) => (
                <li key={item.itemId} className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3">
                  <span className="flex-1 truncate text-title-sm font-semibold">{item.name}</span>
                  <span className="text-body-md text-gray-600">
                    {item.startQty} →{" "}
                    {item.nowQty === 0 ? (
                      <b className="font-semibold text-success-300">완판</b>
                    ) : (
                      <b className="font-semibold text-black">{item.nowQty}개</b>
                    )}
                  </span>
                  {isSlow(item) && (
                    <span className="rounded bg-primary-500 px-1.5 py-0.5 text-caption font-semibold text-white">
                      거의 안 팔림
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 다음 한 수 */}
        {suggestion && (
          <section className="mt-4 rounded-2xl border border-gray-300 px-4 py-4">
            <p className="text-label-md font-semibold text-primary-600">다음 한 수</p>
            <p className="mt-2 text-body-lg">
              {withSubject(suggestion.item.name)} 세일 후에도 {soldOf(suggestion.item)}개만 팔렸어요. 할인을 더
              올려볼까요?
            </p>
            <button
              type="button"
              disabled={raising}
              onClick={() => raiseRate(suggestion.rate)}
              className="mt-3 h-12 w-full rounded-xl border border-gray-400 bg-white text-label-md font-semibold active:bg-gray-100 disabled:opacity-50"
            >
              {raising ? "바꾸는 중..." : `${suggestion.rate}%로 올리기`}
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
