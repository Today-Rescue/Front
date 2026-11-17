"use client";

import { useState } from "react";
import { CtaButton } from "@/components/common/CtaButton";
import BottomSheet from "./BottomSheet";
import Stepper from "./Stepper";
import type { ProductionItem } from "./types";

type ExtraProductionSheetProps = {
  open: boolean;
  /** 등록된 품목 (이름과 오늘 만든 수량) */
  items: ProductionItem[];
  /** '추가하기'를 눌렀을 때. 시트 닫기는 부모가 처리 (저장은 API 연동 때 여기서 호출) */
  onSubmit: (value: { itemId: number; quantity: number }) => void;
  /** 바깥 클릭 또는 X. 저장하지 않고 닫는 동작 */
  onClose: () => void;
};

const DEFAULT_QUANTITY = 10;
const QUICK_QUANTITIES = [6, 10, 12] as const;

/**
 * 추가 생산 기록 시트 (오전-5)
 * 빵을 더 구웠을 때 품목과 수량을 골라 오늘 만든 수량에 더한다.
 */
export default function ExtraProductionSheet({ open, items, onSubmit, onClose }: ExtraProductionSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="더 구운 빵을 기록해요"
      description="지금 시각으로 오늘 만든 수량에 더해져요."
    >
      {/* 시트가 열릴 때마다 새로 만들어져서 품목·수량이 처음 상태로 돌아감 */}
      <ExtraProductionForm items={items} onSubmit={onSubmit} />
    </BottomSheet>
  );
}

function ExtraProductionForm({
  items,
  onSubmit,
}: Pick<ExtraProductionSheetProps, "items" | "onSubmit">) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div>
      <section aria-label="품목 선택">
        <p className="text-label-md font-semibold">품목</p>
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {items.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(item.id)}
                  className={`h-12 w-full truncate rounded-xl border-2 px-2 text-body-md transition-colors ${
                    isSelected
                      ? "border-primary-500 bg-primary-50 font-bold text-black"
                      : "border-gray-200 bg-white font-medium text-gray-800 active:bg-gray-100"
                  }`}
                >
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="수량" className="mt-6">
        <p className="text-label-md font-semibold">수량</p>
        <div className="mt-3 flex justify-center">
          <Stepper value={quantity} onChange={setQuantity} min={1} size="lg" label="추가 생산 수량" />
        </div>

        <div className="mt-3 flex justify-center gap-2">
          {QUICK_QUANTITIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuantity(q)}
              className={`h-9 rounded-full border px-4 text-label-md font-medium transition-colors ${
                quantity === q
                  ? "border-primary-500 bg-primary-50 text-primary-600"
                  : "border-gray-300 bg-white text-gray-800 active:bg-gray-100"
              }`}
            >
              {q}개
            </button>
          ))}
        </div>

        <p className="mt-4 min-h-6 text-center text-body-md text-gray-700">
          {selected
            ? `${selected.name} 오늘 만든 수량 ${selected.madeToday}개 → ${selected.madeToday + quantity}개`
            : "품목을 고르면 오늘 만든 수량이 어떻게 바뀌는지 보여드려요."}
        </p>
      </section>

      <div className="mt-4">
        <CtaButton
          disabled={!selected}
          onClick={() => selected && onSubmit({ itemId: selected.id, quantity })}
        >
          {selected ? `${selected.name} ${quantity}개 추가하기` : "품목을 선택해 주세요"}
        </CtaButton>
      </div>
    </div>
  );
}
