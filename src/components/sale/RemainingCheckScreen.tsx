"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import Stepper from "@/components/scan/Stepper";
import { API_BASE_URL, ApiError } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { activeCampaignIds, endCampaign, fetchRemainingRows, recordSales } from "./api";
import { MOCK_REMAINING, MOCK_SCAN_TIME } from "./mock";
import { SALE_PATHS } from "./paths";
import type { LiveStatus, RemainingRow } from "./types";
import { toLeftParam } from "./utils";

const initialCounts = (rows: RemainingRow[]) => Object.fromEntries(rows.map((r) => [r.itemId, r.estimatedQty]));

/**
 * ④-1 마감 남은 빵 확인 (수동 입력)
 * ④에서 '영업 종료하고 남은 빵 확인하기'를 누르면 들어온다.
 * 판매 속도로 예상한 남은 수량을 미리 채워 두고, 사장님이 −/+로 고친다.
 * 스캔 때보다 줄어든 수량 중 아직 기록되지 않은 것은 매장(store)에서 팔린 것으로 기록한다.
 * '마감 기록하기' → (할인 품목 매장 판매 확정) → 진행 중인 세일 끝내기 → ⑤로 남은 수량 넘김
 */
export default function RemainingCheckScreen() {
  const router = useRouter();

  const [rows, setRows] = useState<RemainingRow[]>(MOCK_REMAINING);
  const [scanTime, setScanTime] = useState<string | null>(MOCK_SCAN_TIME);
  const [counts, setCounts] = useState<Record<number, number>>(() => initialCounts(MOCK_REMAINING));
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [isExample, setIsExample] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!API_BASE_URL) return;
    let cancelled = false;

    fetchRemainingRows()
      .then((res) => {
        if (cancelled || !res) return;
        setRows(res.rows);
        setCounts(initialCounts(res.rows));
        // '2026-11-18T18:02+09:00' → '18:02' (가게 시간 그대로)
        setScanTime(res.scannedAt.slice(11, 16));
        setLive(res.live);
        setIsExample(false);
      })
      .catch((err) => console.warn("[sale] 남은 빵 불러오기 실패, mock 데이터로 보여줘요", err));

    return () => {
      cancelled = true;
    };
  }, []);

  const totalLeft = rows.reduce((sum, r) => sum + (counts[r.itemId] ?? 0), 0);
  const totalScan = rows.reduce((sum, r) => sum + r.scanQty, 0);
  const decrease = totalScan - totalLeft;
  const scanLabel = scanTime ?? "스캔";

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!isExample && live) {
        // 1) 할인 세일 품목: 스캔 이후 줄었는데 세일에서 아직 기록되지 않은 만큼을 매장(store) 판매로 확정
        //    (세일에 없는 품목은 보내지 않아도 됨. 남은 수량만 확정하면 정가 판매로 계산됨)
        const discount = live.discount;
        if (discount?.status === "active") {
          const saleItemIds = new Set(discount.items.map((i) => i.item_id));
          const storeSales = rows
            .filter((r) => saleItemIds.has(r.itemId))
            .map((r) => ({ item_id: r.itemId, quantity: r.scanQty - (counts[r.itemId] ?? 0) - r.recordedSold }))
            .filter((s) => s.quantity > 0);
          if (storeSales.length > 0) {
            try {
              await recordSales(discount.campaign_id, { channel: "store", items: storeSales });
            } catch (err) {
              // 서버의 차감 함수가 아직 없으면 501 APPLY_SALE_NOT_READY → 마감은 계속 진행
              if (!(err instanceof ApiError && err.status === 501)) throw err;
              console.warn("[sale] 판매 확정 API 준비 전이라 건너뛰어요", err);
            }
          }
        }
        // 2) 진행 중인 세일 끝내기 (자동 종료 없음)
        await Promise.all(activeCampaignIds(live).map(endCampaign));
      }
      // ⑤ 오늘 마감 기록에 확인한 남은 수량을 넘겨줌 (예시 화면이면 넘기지 않음)
      router.push(isExample ? SALE_PATHS.closing : `${SALE_PATHS.closing}?left=${toLeftParam(counts)}`);
    } catch (err) {
      console.warn("[sale] 마감 기록 실패", err);
      setError("기록하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  return (
    <main>
      <HeaderBar
        title="마감 남은 빵 확인"
        backHref={SALE_PATHS.status}
      />

      <div className="px-6 pt-2">
        {/* 안내 배너 */}
        <section className="flex items-center gap-3 rounded-2xl bg-primary-50 px-4 py-3">
          <p className="flex-1 text-body-md text-gray-800">판매 속도로 예상한 남은 수량을 먼저 채워뒀어요</p>
          <Link href={ROUTES.scan} className="shrink-0 text-label-md font-semibold text-primary-600 underline">
            사진으로 확인
          </Link>
        </section>

        {isExample && (
          <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-700">
            오늘 남은 재고를 아직 찍지 않아서 예시 수량을 보여주고 있어요.
          </p>
        )}

        {/* 제목 */}
        <section className="mt-6">
          <h2 className="text-heading-sm font-bold">남은 빵이 {totalLeft}개 맞나요?</h2>
          <p className="mt-1 text-body-md text-gray-700">
            다르면 −/+로 고쳐주세요. {scanLabel}보다 줄어든 {Math.max(0, decrease)}개는 매장에서 팔린 것으로
            기록해요.
          </p>
        </section>

        {/* 품목별 남은 수량 */}
        <ul className="mt-4 space-y-2">
          {rows.map((row) => {
            const left = counts[row.itemId] ?? 0;
            return (
              <li key={row.itemId} className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-title-sm font-semibold">{row.name}</p>
                  <p className="text-caption text-gray-600">
                    {row.scanQty}개 → <b className="font-semibold text-primary-600">{row.scanQty - left}개</b> 팔림
                  </p>
                </div>
                <Stepper
                  value={left}
                  onChange={(next) => setCounts((prev) => ({ ...prev, [row.itemId]: next }))}
                  min={0}
                  max={row.scanQty}
                  label={`${row.name} 남은 수량`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <BottomCta note={error ? <span className="text-error-300">{error}</span> : "사진 없이 숫자만 확인하면 돼요"}>
        <CtaButton disabled={submitting} onClick={submit}>
          {submitting ? "기록하는 중..." : `남은 ${totalLeft}개로 마감 기록하기`}
        </CtaButton>
      </BottomCta>
    </main>
  );
}
