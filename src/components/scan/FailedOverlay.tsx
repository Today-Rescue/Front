"use client";

import OverlayFrame from "./OverlayFrame";

type FailedOverlayProps = {
  /** notFound = 찾은 품목 없음(①-5 시안), dark = 사진이 너무 어두움(시안 없음, 같은 틀에 문구만 다르게) */
  variant?: "notFound" | "dark";
  /** 두 번 연속 못 찾았으면 true. '직접 입력해도 돼요' 안내가 추가로 나옴 */
  failedTwice: boolean;
  /** 앨범에서 사진 고르기 */
  onGallery: () => void;
  /** 촬영 화면으로 돌아가 다시 촬영 */
  onRetake: () => void;
  /** 사진 없이 빈 수량 화면으로 */
  onManual: () => void;
};

/** ①-5 인식 실패 · 직접 입력 */
export default function FailedOverlay({ variant = "notFound", failedTwice, onGallery, onRetake, onManual }: FailedOverlayProps) {
  return (
    <OverlayFrame
      label={variant === "dark" ? "사진이 너무 어두워요" : "찾은 품목이 없어요"}
      card={
        <>
          <h2 className="text-title-lg font-bold break-keep">
            {variant === "dark" ? "사진이 너무 어두워요" : "찾은 품목이 없어요"}
          </h2>
          <p className="mt-1 text-caption leading-4 break-keep text-gray-700">
            {variant === "dark" ? (
              <>
                밝은 곳에서 다시 찍어주세요.
                <br />
                플래시를 켜고 찍어도 좋아요.
              </>
            ) : (
              <>
                빵이 가려졌거나 화면 밖에 있을 수 있어요.
                <br />
                진열대 전체가 보이도록 다시 찍어도 좋아요.
              </>
            )}
          </p>
          {failedTwice && (
            <p className="mt-4 rounded-xl bg-primary-50 px-3 py-1.5 text-caption leading-4 break-keep text-primary-700">
              두 번 연속 못 찾았어요. 바쁘시면 직접 입력해도 돼요.
            </p>
          )}
        </>
      }
      actions={
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onGallery}
              className="h-12 shrink-0 rounded-full bg-white px-6 text-label-md font-bold text-black active:bg-gray-200"
            >
              갤러리
            </button>
            <button
              type="button"
              onClick={onRetake}
              className="h-12 flex-1 rounded-full bg-primary-500 text-label-lg font-bold text-white active:bg-primary-600"
            >
              진열대 사진 찍기
            </button>
          </div>
          <button
            type="button"
            onClick={onManual}
            className="mt-2 h-12 w-full rounded-full border border-white/30 text-label-md font-bold text-white active:bg-white/10"
          >
            사진 없이 직접 입력하기
          </button>
        </>
      }
    />
  );
}
