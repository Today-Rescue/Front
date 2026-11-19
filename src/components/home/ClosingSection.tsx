"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDiscount } from "@/components/sale/api";
import { ROUTES } from "@/lib/routes";
import { formatAmPm, formatNumber } from "@/lib/time";
import type { HomeData } from "@/types/home";

/** ①: 매대 촬영 버튼 + 스캔 결과·바로 팔기 + AI 세트 추천 */
export default function ClosingSection({
  data,
  onAcceptBundle,
}: {
  data: HomeData;
  onAcceptBundle: () => Promise<void>;
}) {
  const router = useRouter();
  const { lastScan, saleLive, bundle, bundleOnSale } = data;
  const [busy, setBusy] = useState<"sale" | "bundle" | null>(null);
  const [error, setError] = useState("");

  /** 추천값 그대로(30%, 위험·주의 품목) 마켓에 올리고 ④ 세일 현황으로 */
  const startBulkSale = async () => {
    setBusy("sale");
    setError("");
    try {
      await createDiscount({ discount_rate: lastScan?.recommendedDiscount });
      router.push(ROUTES.saleStatus);
    } catch (err) {
      console.error(err);
      setError("세일을 올리지 못했어요. 잠시 후 다시 눌러 주세요.");
      setBusy(null);
    }
  };

  const acceptBundle = async () => {
    setBusy("bundle");
    setError("");
    try {
      await onAcceptBundle();
    } catch (err) {
      console.error(err);
      setError("세트를 올리지 못했어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {/* 3. 매대 촬영 버튼 */}
      <div className="mx-6 mt-4">
        <Link
          href={ROUTES.scan}
          className="flex h-16 w-full items-center justify-center rounded-3xl bg-primary-500 text-title-lg font-semibold text-white active:bg-primary-600"
        >
          남은 수량 파악하기
        </Link>
        <p className="mt-2 text-center text-caption text-gray-600">
          {lastScan
            ? `마지막 스캔 ${formatAmPm(lastScan.time)}${lastScan.shelves ? ` · 매대 ${lastScan.shelves}곳 인식` : ""}`
            : "아직 마감 스캔 기록이 없어요"}
        </p>
      </div>

      {/* 4. 스캔 결과 · 바로 팔기 */}
      <section className="mt-7 px-6">
        <h2 className="text-title-lg font-bold">스캔 결과 · 바로 팔기</h2>

        {lastScan ? (
          <div className="mt-3 rounded-2xl bg-gray-100 p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-body-md text-gray-700">오늘 만든 {lastScan.madeTotal}개 중 남은 재고</p>
                <p className="text-display-sm font-bold">
                  {lastScan.remaining}
                  <span className="text-title-lg">개</span>
                </p>
              </div>
              <div className="text-right text-caption text-gray-700">
                <p>
                  위험 품목 <b className="font-semibold text-error-300">{lastScan.riskKinds}종</b>
                </p>
                <p>
                  주의 품목 <b className="font-semibold text-error-300">{lastScan.cautionKinds}종</b>
                </p>
              </div>
            </div>

            {saleLive ? (
              <Link
                href={ROUTES.saleStatus}
                className="mt-4 flex h-14 w-full items-center justify-center rounded-3xl bg-primary-500 text-label-lg font-semibold text-white"
              >
                마켓 게시 중 · 현황 보기
              </Link>
            ) : (
              <button
                type="button"
                onClick={startBulkSale}
                disabled={busy !== null}
                className="mt-4 h-14 w-full rounded-3xl bg-primary-500 text-label-lg font-semibold text-white active:bg-primary-600 disabled:opacity-60"
              >
                {busy === "sale" ? "마켓에 올리는 중…" : `일괄 ${lastScan.recommendedDiscount}% 마감 세일 시작하기`}
              </button>
            )}

            <div className="mt-3 flex items-center gap-2 text-caption text-gray-700">
              <span>올리는 곳</span>
              <span className="flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2.5 py-1 font-medium text-black">
                오늘구조대 마켓
              </span>
              <Link href={ROUTES.saleDiscount} className="ml-auto font-medium text-primary-600 underline underline-offset-2">
                할인율·품목 변경
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-gray-400 px-5 py-8 text-center text-body-md text-gray-600">
            매대를 찍으면 남은 빵과
            <br />
            할인할 빵을 바로 정리해 드려요
          </div>
        )}
      </section>

      {error && <p className="mx-6 mt-3 text-center text-caption text-error-300">{error}</p>}

      {/* 5. AI 세트 추천 */}
      {lastScan && bundle && (
        <section className="mx-6 mt-4 rounded-2xl border border-primary-100 bg-primary-50 p-5">
          <p className="text-label-md font-semibold text-primary-600">
            AI 세트 추천 · 오늘의 추천 묶음
          </p>

          <div className="mt-3 flex items-center gap-4">
            <span className="flex size-16 items-center justify-center rounded-xl border border-gray-200 bg-white" aria-hidden>
              <span className="size-8 rounded-md bg-primary-200" />
            </span>
            <div>
              <p className="text-title-lg font-semibold">{bundle.name}</p>
              <p className="text-title-lg font-bold text-primary-600">{formatNumber(bundle.price)}원</p>
            </div>
          </div>

          <p className="mt-3 text-body-md text-gray-800">
            재고가 많은{" "}
            {bundle.items.map((it, i) => (
              <span key={it.name}>
                {i > 0 && "과 "}
                <b className="font-semibold text-black">
                  {it.name}({it.qty}개)
                </b>
              </span>
            ))}
            를 남는 빵이 가장 적게 묶어 ‘{bundle.name}’ <b className="font-semibold text-black">{bundle.packs}팩</b>으로
            구성했어요. {bundleOnSale ? "" : "지금 바로 판매 올릴까요?"}
          </p>

          {bundleOnSale ? (
            <Link
              href={ROUTES.saleStatus}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-white text-label-md font-semibold text-primary-600"
            >
              ● 판매 중 · 현황 보기
            </Link>
          ) : (
            <div className="mt-4 flex gap-2">
              <Link
                href={ROUTES.saleBundle}
                className="flex h-12 flex-1 items-center justify-center rounded-full border border-gray-200 bg-white text-label-md font-semibold"
              >
                구성 수정
              </Link>
              <button
                type="button"
                onClick={acceptBundle}
                disabled={busy !== null}
                className="h-12 flex-[1.4] rounded-full bg-primary-500 text-label-md font-semibold text-white active:bg-primary-600 disabled:opacity-60"
              >
                {busy === "bundle" ? "올리는 중…" : "수락 및 판매"}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

