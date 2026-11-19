"use client";

import OverlayFrame from "./OverlayFrame";

type PartialResultOverlayProps = {
  /** 찾은 품목 수 */
  found: number;
  /** 등록된 전체 품목 수 */
  total: number;
  /** 못 찾은 품목. note는 참고 메모 (예: '어제 마감 때 4개') */
  missing: { name: string; note?: string }[];
  /** 매대 더 찍기. 찍은 사진은 유지하고 다음 매대를 추가 */
  onAddShelf: () => void;
  /** 찾은 결과로 계속하기. 못 찾은 품목은 다음 화면 맨 위에 수량 0으로 표시 */
  onContinue: () => void;
};

/** ①-4 일부만 인식 */
export default function PartialResultOverlay({ found, total, missing, onAddShelf, onContinue }: PartialResultOverlayProps) {
  return (
    <OverlayFrame
      label="일부 품목만 찾았어요"
      card={
        <>
          <h2 className="text-title-lg font-bold break-keep">
            {total}개 중 {found}개 품목을 찾았어요
          </h2>
          <p className="mt-1 text-caption leading-4 break-keep text-gray-700">
            아래 빵은 사진에서 못 찾았어요.
            <br />
            가려졌거나 다른 매대에 있을 수 있어요.
          </p>

          <ul className="mt-3 space-y-2 border-t border-gray-400/60 pt-4 text-left">
            {missing.map((item) => (
              <li key={item.name} className="flex items-center gap-2">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary-500" />
                <span className="text-label-md font-bold">{item.name}</span>
                {item.note && <span className="ml-auto text-caption text-gray-700">{item.note}</span>}
              </li>
            ))}
          </ul>

          <p className="mt-3.5 text-caption leading-4 break-keep text-gray-700">못 찾은 빵은 다음 화면 맨 위에서 직접 입력할 수 있어요</p>
        </>
      }
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAddShelf}
            className="h-12 shrink-0 rounded-full bg-white px-6 text-label-md font-bold text-black active:bg-gray-200"
          >
            매대 더 찍기
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-12 flex-1 rounded-full bg-primary-500 text-label-lg font-bold text-white active:bg-primary-600"
          >
            찾은 결과로 계속하기
          </button>
        </div>
      }
    />
  );
}
