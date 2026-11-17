"use client";

import { useState } from "react";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import HeaderBar from "@/components/common/HeaderBar";
import PhotoBanner from "./PhotoBanner";
import Stepper from "./Stepper";

export type OpenConfirmItem = {
  id: number;
  name: string;
  /** 비교용 어제 만든 수량 */
  yesterday: number;
  /** 사진에서 찾은(또는 고친) 오늘 수량 */
  quantity: number;
};

type OpenConfirmScreenProps = {
  /** 사진 위 라벨 (예: '진열 사진 3장 · 오전 9:10') */
  photoLabel: string;
  photoUrl?: string;
  items: OpenConfirmItem[];
  /** < 클릭. 오전-3 촬영 화면으로 돌아가도록 부모가 처리 */
  onBack: () => void;
  /** '다시 찍기' 클릭. 오전-2로 이동 */
  onRetake: () => void;
  /** 저장 버튼. 고친 수량을 넘김. 저장 후 메인으로 이동은 부모가 처리 */
  onSave: (items: OpenConfirmItem[]) => void;
};

/** 오전-4 최초 진열 확인 (만든 수량) */
export default function OpenConfirmScreen({ photoLabel, photoUrl, items, onBack, onRetake, onSave }: OpenConfirmScreenProps) {
  const [rows, setRows] = useState(items);
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);

  const setQuantity = (id: number, quantity: number) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, quantity } : row)));

  return (
    <>
      <HeaderBar title="오늘 만든 빵 확인" onBack={onBack} right={<span className="text-body-md text-gray-700">오전 진열</span>} />

      <main className="px-5 pt-2">
        <PhotoBanner label={photoLabel} photoUrl={photoUrl} heightClass="h-28" onRetake={onRetake} />

        <h2 className="mt-5 text-heading-sm font-bold">오늘 진열된 빵 {total}개를 찾았어요</h2>
        <p className="mt-1 text-body-md break-keep text-gray-700">이 수량을 오늘 만든 수량으로 기록해요. 다르면 −/+로 고쳐주세요.</p>

        <ul className="mt-5 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-2xl bg-gray-100 py-2.5 pr-2.5 pl-3.5">
              <div className="min-w-0">
                <p className="truncate text-title-sm font-bold">{row.name}</p>
                <p className="text-caption text-gray-700">어제 {row.yesterday}개</p>
              </div>
              <Stepper value={row.quantity} onChange={(next) => setQuantity(row.id, next)} label={`${row.name} 수량`} />
            </li>
          ))}
        </ul>
      </main>

      <BottomCta note="오후에 더 구운 빵은 메인의 [추가 생산]으로 더하면 돼요">
        <CtaButton onClick={() => onSave(rows)}>만든 수량 {total}개 저장</CtaButton>
      </BottomCta>
    </>
  );
}
