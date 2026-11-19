"use client";

import { useRouter } from "next/navigation";

type HeaderBarProps = {
  /** 가운데 왼쪽 제목 (예: '남은 재고 확인'). 온보딩처럼 제목이 없으면 생략 */
  title?: string;
  /** < 눌렀을 때 갈 경로. 없으면 브라우저 뒤로가기 */
  backHref?: string;
  /** < 눌렀을 때 직접 처리하고 싶을 때 (backHref보다 우선) */
  onBack?: () => void;
  /** 오른쪽 단계 표시 '1 / 2 단계' */
  step?: { current: number; total: number };
  /** 온보딩용 진행 막대 + '1 / 3' */
  progress?: { current: number; total: number };
  /** 오른쪽에 넣을 다른 요소 (예: '오전 진열', 날짜, '● 진행 중') */
  right?: React.ReactNode;
};

/**
 * 단계 화면의 상단 헤더 바
 * - 스크롤해도 상단에 고정
 * - < 클릭 시 이전 화면으로
 *
 * 사용 예)
 *   <HeaderBar title="남은 재고 확인" backHref="/" step={{ current: 1, total: 2 }} />
 *   <HeaderBar backHref="/onboarding" progress={{ current: 1, total: 3 }} />
 */
export default function HeaderBar({ title, backHref, onBack, step, progress, right }: HeaderBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) return onBack();
    if (backHref) return router.push(backHref);
    router.back();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-white px-6">
      <button
        type="button"
        onClick={handleBack}
        aria-label="뒤로 가기"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M15 5l-7 7 7 7" stroke="var(--color-black)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {title && <h1 className="flex-1 truncate text-title-sm font-semibold">{title}</h1>}
      {!title && !progress && <div className="flex-1" />}

      {/* 온보딩 진행 표시: 가운데 점(●○○) + 오른쪽 '1 / 3' */}
      {progress && (
        <>
          <div className="flex flex-1 justify-center gap-1.5" aria-hidden>
            {Array.from({ length: progress.total }, (_, i) => (
              <span
                key={i}
                className={`size-2.5 rounded-full ${i + 1 === progress.current ? "bg-primary-500" : "bg-gray-200"}`}
              />
            ))}
          </div>
          <span className="w-11 text-right text-body-md text-gray-700">
            {progress.current} / {progress.total}
          </span>
        </>
      )}

      {step && (
        <span className="text-caption font-medium text-gray-600">
          {step.current} / {step.total} 단계
        </span>
      )}

      {right}
    </header>
  );
}
