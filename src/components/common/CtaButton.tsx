"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { APP_MAX_WIDTH, TAB_BAR_HEIGHT } from "./layout";

type CtaButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary = 주황(주 버튼), secondary = 연한 주황(보조 버튼) */
  variant?: "primary" | "secondary";
};

/**
 * 전체 너비 버튼. 문구에 결과와 수량을 넣기 (예: '30% 할인 마켓에 올리기')
 *
 * 사용 예) <CtaButton disabled={!name} onClick={next}>다음</CtaButton>
 */
export function CtaButton({ variant = "primary", className = "", ...props }: CtaButtonProps) {
  const color =
    variant === "primary"
      ? "bg-primary-500 text-white active:bg-primary-600"
      : "bg-primary-50 text-primary-600 active:bg-primary-100";

  return (
    <button
      type="button"
      {...props}
      className={`h-14 w-full rounded-full text-label-lg font-semibold transition-colors disabled:bg-gray-200 disabled:text-gray-500 ${color} ${className}`}
    />
  );
}

/**
 * 화면 하단에 고정되는 CTA 영역. 버튼을 하나 또는 두 개(가로) 넣기.
 * 콘텐츠가 버튼에 가리지 않도록 버튼 영역 높이만큼 빈 공간을 자동으로 깔아 줌 (+ 마지막 콘텐츠와 24px).
 * 탭바가 있는 화면에서 쓰면 탭바 바로 위에 붙음.
 *
 * 사용 예)
 *   <BottomCta>
 *     <CtaButton>만든 수량 188개 저장</CtaButton>
 *   </BottomCta>
 *
 *   <BottomCta>
 *     <CtaButton variant="secondary">품목 추가</CtaButton>
 *     <CtaButton>가게 설정 완료</CtaButton>
 *   </BottomCta>
 */
export function BottomCta({
  children,
  note,
  aboveTabBar = false,
}: {
  children: React.ReactNode;
  /** 버튼 아래 작은 안내 문구 */
  note?: React.ReactNode;
  /** 탭바 있는 화면이면 true */
  aboveTabBar?: boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(100);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* 자리 맡기용 빈 공간 */}
      <div aria-hidden style={{ height: height + 24 }} />
      <div
        ref={barRef}
        className="fixed left-1/2 z-30 w-full -translate-x-1/2 bg-white px-6 pt-3 pb-5"
        style={{
          maxWidth: APP_MAX_WIDTH,
          bottom: aboveTabBar ? `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))` : 0,
          paddingBottom: aboveTabBar ? undefined : "calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex gap-2">{children}</div>
        {note && <div className="mt-2 text-center text-caption text-gray-600">{note}</div>}
      </div>
    </>
  );
}
