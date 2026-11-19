"use client";

import BottomSheet from "./BottomSheet";
import type { ScanPurpose } from "./types";

type PurposeSheetProps = {
  open: boolean;
  /** 지금 추천하는 목적. 마감 알림 시각 전 = open, 이후 = close (서버의 scans/purpose 결과를 그대로 넘김) */
  recommended: ScanPurpose;
  /** 마감 알림 시각 (예: '18:00'). 아래 안내 문구에 들어감. 가게 설정에서 가져온 값을 넘기기 */
  notifyTime?: string;
  /** 카드를 눌렀을 때. 어느 화면으로 갈지는 부모(페이지)가 정함 */
  onSelect: (purpose: ScanPurpose) => void;
  /** 바깥(어두운 부분) 클릭. 오전-2는 오전-1로, ①-1은 ①로 돌아가도록 부모가 처리 */
  onClose: () => void;
};

const OPTIONS: { purpose: ScanPurpose; title: string; description: string }[] = [
  { purpose: "open", title: "최초 진열", description: "아침에 진열한 빵을 찍어 오늘 만든 수량으로 기록해요" },
  { purpose: "close", title: "재고 기록", description: "남은 빵을 찍어 위험한 빵과 할인할 빵을 정리해요" },
];

/**
 * 촬영 목적 선택 바텀시트 (오전-2, ①-1 공용)
 * 두 화면은 '지금 추천' 표시와 아래 안내 문구, 닫았을 때 돌아갈 곳만 다름
 */
export default function PurposeSheet({ open, recommended, notifyTime = "18:00", onSelect, onClose }: PurposeSheetProps) {
  const footer =
    recommended === "open"
      ? `마감 알림 시각(${notifyTime}) 전에는 ‘최초 진열’을 추천해요`
      : `마감 알림 시각(${notifyTime}) 이후에는 ‘재고 기록’을 추천해요`;

  return (
    <BottomSheet open={open} onClose={onClose} title="무엇을 기록할까요?" description="찍는 목적에 따라 다음 화면이 달라져요.">
      <ul className="space-y-3.5">
        {OPTIONS.map((option) => {
          const isRecommended = option.purpose === recommended;
          return (
            <li key={option.purpose}>
              <button
                type="button"
                onClick={() => onSelect(option.purpose)}
                className={`flex w-full items-center rounded-2xl border p-4 text-left transition-colors ${
                  isRecommended
                    ? "border-primary-500 bg-primary-50 active:bg-primary-100"
                    : "border-gray-300 bg-white active:bg-gray-100"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-title-sm font-bold">{option.title}</span>
                    {isRecommended && (
                      <span className="rounded-md bg-primary-500 px-2 py-0.5 text-label-md font-bold text-white">
                        지금 추천
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-body-md break-keep text-gray-700">{option.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-caption text-gray-700">{footer}</p>
    </BottomSheet>
  );
}
