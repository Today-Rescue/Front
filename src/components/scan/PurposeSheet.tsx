"use client";

import BottomSheet from "./BottomSheet";
import type { ScanPurpose } from "./types";

type PurposeSheetProps = {
  open: boolean;
  /** 지금 추천하는 목적. 마감 알림 시각 전 = open, 이후 = close (서버의 scans/purpose 결과를 그대로 넘김) */
  recommended: ScanPurpose;
  /** 카드를 눌렀을 때. 어느 화면으로 갈지는 부모(페이지)가 정함 */
  onSelect: (purpose: ScanPurpose) => void;
  /** 바깥 클릭 또는 X. 오전-2는 오전-1로, ①-1은 ①로 돌아가도록 부모가 처리 */
  onClose: () => void;
};

// 카드 설명 문구는 임시. 디자인 확정 문구가 있으면 교체
const OPTIONS: { purpose: ScanPurpose; title: string; description: string }[] = [
  { purpose: "open", title: "최초 진열", description: "진열을 마친 매대를 찍고 오늘 만든 수량을 기록해요." },
  { purpose: "close", title: "재고 기록", description: "남은 빵을 찍고 재고와 위험도를 확인해요." },
];

/**
 * 촬영 목적 선택 바텀시트 (오전-2, ①-1 공용)
 * 두 화면은 '지금 추천' 뱃지 위치와 닫았을 때 돌아갈 곳만 다름
 */
export default function PurposeSheet({ open, recommended, onSelect, onClose }: PurposeSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="무엇을 기록할까요?"
      description="찍는 목적에 따라 다음 화면이 달라져요."
    >
      <ul className="space-y-3">
        {OPTIONS.map((option) => {
          const isRecommended = option.purpose === recommended;
          return (
            <li key={option.purpose}>
              <button
                type="button"
                onClick={() => onSelect(option.purpose)}
                className={`w-full rounded-2xl border-2 p-4 text-left transition-colors ${
                  isRecommended
                    ? "border-primary-500 bg-primary-50 active:bg-primary-100"
                    : "border-gray-200 bg-white active:bg-gray-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-title-sm font-semibold">{option.title}</span>
                  {isRecommended && (
                    <span className="rounded-full bg-primary-500 px-2 py-0.5 text-label-sm font-semibold text-white">
                      지금 추천
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-body-md text-gray-700">{option.description}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-caption text-gray-600">
        마감 알림 시각 전에는 최초 진열, 이후에는 재고 기록을 추천해요.
      </p>
    </BottomSheet>
  );
}
