"use client";

import OverlayFrame, { ManualError } from "./OverlayFrame";

const STEPS = ["사진 올리기", "빵 종류 찾기", "개수 세기", "위험도 계산"] as const;

type AnalyzingOverlayProps = {
  /** 지금 진행 중인 단계 (0 = 사진 올리기 … 3 = 위험도 계산). 이전 단계는 완료로 표시 */
  currentStep: number;
  /** 20초가 넘게 걸리는 중이면 true. 문구가 '오래 걸려요'로 바뀜 */
  slow: boolean;
  /** 분석을 멈추고 촬영 화면으로 */
  onCancel: () => void;
  /** 저장해 둔 사진으로 다시 분석 */
  onRetry: () => void;
  /** 사진 없이 빈 수량 화면으로 */
  onManual: () => void;
  /** 직접 입력 화면을 준비하는 중이면 true (버튼 잠금) */
  manualLoading?: boolean;
  /** 직접 입력 실패 안내 (버튼 아래에 보여줌) */
  manualError?: string;
};

/** ①-3 분석 지연·오류. 분석이 끝나면(스캔 결과 화면으로 이동) 부모가 이 화면을 치움 */
export default function AnalyzingOverlay({
  currentStep,
  slow,
  onCancel,
  onRetry,
  onManual,
  manualLoading = false,
  manualError,
}: AnalyzingOverlayProps) {
  return (
    <OverlayFrame
      narrow
      label="사진 분석 중"
      card={
        <>
          <h2 className="text-title-lg font-bold break-keep">
            {slow ? "분석이 평소보다 오래 걸려요" : "사진에서 품목과 수량을 찾고 있어요."}
          </h2>
          <p className="mt-1 text-caption leading-4 break-keep text-gray-700">
            {slow ? (
              <>
                인터넷 연결이 약하거나 서버가 바쁠 수 있어요.
                <br />
                찍은 사진은 저장해 두었어요.
              </>
            ) : (
              "잠시만 기다려 주세요."
            )}
          </p>

          <ol className="mt-3 space-y-2.5 border-t border-gray-400/60 pt-4 text-left">
            {STEPS.map((label, i) => {
              const state = i < currentStep ? "done" : i === currentStep ? "current" : "pending";
              return (
                <li key={label} aria-current={state === "current" ? "step" : undefined} className="flex items-center gap-2.5">
                  <StepMark state={state} />
                  <span
                    className={`text-label-md ${
                      state === "current" ? "font-bold" : state === "done" ? "font-medium" : "text-gray-600"
                    }`}
                  >
                    {label}
                  </span>
                  {state === "current" && slow && (
                    <span className="ml-auto text-caption text-primary-600">20초 넘게 걸리는 중</span>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      }
      actions={
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-12 shrink-0 rounded-full bg-white px-6 text-label-md font-bold text-black active:bg-gray-200"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="h-12 flex-1 rounded-full bg-primary-500 text-label-lg font-bold text-white active:bg-primary-600"
            >
              다시 시도
            </button>
          </div>
          <button
            type="button"
            onClick={onManual}
            disabled={manualLoading}
            className="mx-auto mt-4 block text-label-md font-bold text-primary-300 underline underline-offset-4 disabled:text-white/50"
          >
            {manualLoading ? "불러오는 중..." : "사진 없이 직접 입력하기"}
          </button>
          <ManualError message={manualError} />
        </>
      }
    />
  );
}

function StepMark({ state }: { state: "done" | "current" | "pending" }) {
  if (state === "done") {
    return (
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-900">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5 9-10" />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary-500">
        <span className="size-2 rounded-full bg-primary-500" />
      </span>
    );
  }
  return <span aria-hidden className="size-5 shrink-0 rounded-full border-2 border-gray-300" />;
}
