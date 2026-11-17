"use client";

import { useLayoutEffect, useRef, useState } from "react";
import HeaderBar from "@/components/common/HeaderBar";
import { APP_MAX_WIDTH } from "@/components/common/layout";
import PhotoBanner from "./PhotoBanner";
import Stepper from "./Stepper";

/** danger = 위험, caution = 주의, ok = 여유 */
export type StockLevel = "danger" | "caution" | "ok";

export type ScanResultItem = {
  id: number;
  name: string;
  level: StockLevel;
  /** 보조 메모 (예: '오늘 소비기한', '냉장 보관 중') */
  memo?: string;
  /** 사진에서 일부 가려지거나 못 찾은 품목. '개수 확인 필요' 뱃지 */
  needsCheck?: boolean;
  /** 사진에서 못 찾은 품목. 목록 맨 위에 수량 0으로 보여줌 */
  notFound?: boolean;
  quantity: number;
  /** 품목 사진. 없으면 회색 자리 표시 */
  imageUrl?: string;
};

export type SellMethod = "discount" | "bundle";

type ScanResultScreenProps = {
  /** 사진 위 라벨 (예: '매대 사진 · 오후 6:02') */
  photoLabel: string;
  photoUrl?: string;
  /** 수량은 부모가 들고 있음 (고치면 서버에서 위험도를 다시 계산해서 새 목록을 내려줌) */
  items: ScanResultItem[];
  onChangeQuantity: (id: number, quantity: number) => void;
  /** < 클릭. ①로 돌아가도록 부모가 처리 */
  onBack: () => void;
  /** '다시 찍기' 클릭. ①-1로 이동 */
  onRetake: () => void;
  /** 판매 방법을 골랐을 때. 수량 확정과 ③-a / ③-b 이동은 부모가 처리 */
  onConfirm: (method: SellMethod) => void;
  /** 확정 요청 중이면 true (버튼 잠금) */
  confirming?: boolean;
  /** 확정 실패 문구 (하단 안내 자리에 빨간 글씨로) */
  error?: string;
};

const LEVEL_ORDER: StockLevel[] = ["danger", "caution", "ok"];

const SUMMARY_STYLE: Record<StockLevel, { label: string; card: string; labelColor: string }> = {
  danger: { label: "위험", card: "bg-error-100", labelColor: "text-error-400" },
  caution: { label: "주의", card: "bg-primary-50", labelColor: "text-primary-600" },
  ok: { label: "여유", card: "bg-gray-100", labelColor: "text-gray-800" },
};

const BADGE_STYLE: Record<Exclude<StockLevel, "ok">, string> = {
  danger: "bg-error-300 text-white",
  caution: "bg-primary-200 text-primary-700",
};

/** ② 스캔 결과 확인 */
export default function ScanResultScreen({
  photoLabel,
  photoUrl,
  items,
  onChangeQuantity,
  onBack,
  onRetake,
  onConfirm,
  confirming = false,
  error,
}: ScanResultScreenProps) {
  // 못 찾은 품목 맨 위 → 위험 → 주의 → 여유 순 (같은 단계는 들어온 순서 그대로)
  const rank = (row: ScanResultItem) => (row.notFound ? -1 : LEVEL_ORDER.indexOf(row.level));
  const rows = [...items].sort((a, b) => rank(a) - rank(b));
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <>
      <HeaderBar title="남은 재고 확인" onBack={onBack} step={{ current: 1, total: 2 }} />

      <main className="px-5 pt-2">
        <PhotoBanner label={photoLabel} photoUrl={photoUrl} heightClass="h-32" onRetake={onRetake} />

        <h2 className="mt-5 text-heading-sm font-bold">총 {total}개의 재고를 확인했어요</h2>
        <p className="mt-1 text-body-md break-keep text-gray-700">사진과 다르면 −/+로 바로 고쳐주세요. 위험한 빵부터 보여드려요.</p>

        {/* 위험 · 주의 · 여유 요약 */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {LEVEL_ORDER.map((level) => {
            const group = rows.filter((row) => !row.notFound && row.level === level);
            const count = group.reduce((sum, row) => sum + row.quantity, 0);
            const style = SUMMARY_STYLE[level];
            return (
              <div key={level} className={`rounded-2xl px-3 py-2.5 ${style.card}`}>
                <p className={`text-label-md font-bold ${style.labelColor}`}>{style.label}</p>
                <p className="mt-0.5 text-title-lg font-bold whitespace-nowrap">
                  {group.length}종 · {count}개
                </p>
              </div>
            );
          })}
        </div>

        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 rounded-2xl bg-gray-100 py-2.5 pr-2.5 pl-3">
              {/* 품목 사진 */}
              <span className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-200">
                {row.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span aria-hidden className="size-6 rounded-md bg-gray-400/60" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-title-sm font-bold">{row.name}</p>
                <div className={row.needsCheck ? "mt-1 flex flex-col items-start gap-1" : "mt-1 flex items-center gap-1.5"}>
                  {row.level !== "ok" && (
                    <span className={`rounded-md px-2 py-0.5 text-caption font-bold ${BADGE_STYLE[row.level]}`}>
                      {SUMMARY_STYLE[row.level].label}
                    </span>
                  )}
                  {row.needsCheck && (
                    <span className="rounded-lg border border-primary-500 px-2 py-0.5 text-caption font-bold text-primary-600">
                      개수 확인 필요
                    </span>
                  )}
                  {row.memo && <span className="text-label-sm text-gray-700">{row.memo}</span>}
                </div>
              </div>

              <Stepper size="sm" value={row.quantity} onChange={(next) => onChangeQuantity(row.id, next)} label={`${row.name} 수량`} />
            </li>
          ))}
        </ul>
      </main>

      <SellMethodBar disabled={confirming} error={error} onSelect={onConfirm} />
    </>
  );
}

/** 하단 고정: 수량 확정 후 판매 방법 선택 (일괄 할인 / 세트 구성) */
function SellMethodBar({ onSelect, disabled, error }: { onSelect: (method: SellMethod) => void; disabled: boolean; error?: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(170);

  // 콘텐츠가 하단 영역에 가리지 않도록 같은 높이만큼 빈 공간을 깔아 둠
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden style={{ height: height + 24 }} />
      <div
        ref={barRef}
        className="fixed bottom-0 left-1/2 z-30 w-full -translate-x-1/2 bg-white px-5 pt-4"
        style={{ maxWidth: APP_MAX_WIDTH, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <p className="text-label-md font-bold">수량을 확정하고 어떻게 팔까요?</p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onSelect("discount")}
            disabled={disabled}
            className="flex-1 rounded-[20px] bg-primary-500 px-2 py-4 text-center text-white transition-colors active:bg-primary-600 disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-1.5 text-title-lg font-bold">
              {/* 아이콘 자리: 디자인에서 아이콘이 나오면 교체 */}
              <span aria-hidden className="size-5 rounded-md bg-white/30" />
              일괄 할인
            </span>
            <span className="mt-0.5 block text-caption text-white/90">위험·주의 품목 한 번에</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect("bundle")}
            disabled={disabled}
            className="flex-1 rounded-[20px] bg-primary-100 px-2 py-4 text-center text-primary-700 transition-colors active:bg-primary-200 disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-1.5 text-title-lg font-bold">
              <span aria-hidden className="size-5 rounded-md bg-primary-700/20" />
              세트 구성
            </span>
            <span className="mt-0.5 block text-caption">남는 빵 묶어 팔기</span>
          </button>
        </div>

        <p className={`mt-3 text-center text-caption ${error ? "text-error-300" : "text-gray-700"}`}>
          {error ?? "확정한 수량은 오늘 마감 기록에 자동으로 들어가요"}
        </p>
      </div>
    </>
  );
}
