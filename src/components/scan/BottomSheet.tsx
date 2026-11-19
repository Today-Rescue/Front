"use client";

import { useEffect, useRef } from "react";
import { APP_MAX_WIDTH } from "@/components/common/layout";

type BottomSheetProps = {
  open: boolean;
  /** 바깥(어두운 부분) 클릭, X 클릭, Esc 키에서 호출. 저장하지 않고 닫는 동작 */
  onClose: () => void;
  title?: string;
  /** 제목 아래 작은 안내 문구 */
  description?: string;
  /** 위쪽 손잡이 막대. 디자인에는 없어서 기본 꺼짐 */
  showHandle?: boolean;
  /** 제목 옆 X 버튼. 디자인에는 없어서 기본 꺼짐 (바깥 클릭으로 닫힘) */
  showClose?: boolean;
  children: React.ReactNode;
};

/**
 * 아래에서 올라오는 바텀시트 (390px 앱 폭 안에서 보임)
 * - 바깥(어두운 부분) 클릭으로 닫힘. X 버튼은 showClose로 켤 수 있음
 * - 열려 있는 동안 뒤 화면은 스크롤되지 않음
 *
 * 사용 예)
 *   <BottomSheet open={open} onClose={() => setOpen(false)} title="더 구운 빵을 기록해요">
 *     ...
 *   </BottomSheet>
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  description,
  showHandle = false,
  showClose = false,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 어두운 배경: 클릭하면 닫힘 */}
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/60 transition-opacity duration-200 motion-reduce:transition-none starting:opacity-0"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative w-full rounded-t-3xl bg-white px-6 pt-6 text-black outline-none transition-transform duration-200 motion-reduce:transition-none starting:translate-y-full"
        style={{ maxWidth: APP_MAX_WIDTH, paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
      >
        {showHandle && <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />}

        {(title || description) && (
          <div className="flex items-start gap-2">
            <div className="flex-1">
              {title && <h2 className="text-heading-sm font-bold">{title}</h2>}
              {description && <p className="mt-1 text-body-md text-gray-700">{description}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full active:bg-gray-100"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className={title || description ? "mt-6" : undefined}>{children}</div>
      </div>
    </div>
  );
}
