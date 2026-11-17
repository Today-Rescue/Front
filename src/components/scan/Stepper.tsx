"use client";

type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  /** 이보다 작아지지 않음. 기본 0 (세트 구성은 1) */
  min?: number;
  /** 이보다 커지지 않음. 없으면 제한 없음 */
  max?: number;
  /**
   * md = 오전-4 품목 목록 (숫자 양옆 간격 넓음)
   * sm = ② 스캔 결과 목록 (간격 좁음)
   * lg = 추가 생산처럼 크게 보여줄 때
   */
  size?: "sm" | "md" | "lg";
  /** 스크린리더용 이름 (예: '소금빵 수량') */
  label?: string;
};

const BUTTON_SIZE = { sm: "size-11", md: "size-11", lg: "size-12" } as const;
const VALUE_STYLE = {
  sm: "min-w-9 text-heading-sm font-bold",
  md: "min-w-14 text-heading-sm font-bold",
  lg: "min-w-16 text-heading-lg font-bold",
} as const;

/**
 * 수량 스테퍼 (− / +)
 * - 클릭할 때마다 1씩 줄거나 늘어남, min 아래로 내려가지 않음
 * - 합계·버튼 문구는 value가 바뀔 때 부모가 다시 계산
 *
 * 사용 예)
 *   <Stepper value={qty} onChange={setQty} label="소금빵 수량" />
 *   <Stepper value={qty} onChange={setQty} min={1} size="lg" />
 */
export default function Stepper({ value, onChange, min = 0, max, size = "md", label = "수량" }: StepperProps) {
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div role="group" aria-label={label} className="inline-flex items-center">
      <StepButton
        className={BUTTON_SIZE[size]}
        disabled={atMin}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={`${label} 줄이기`}
      >
        <path d="M7 12h10" />
      </StepButton>

      <output aria-live="polite" className={`${VALUE_STYLE[size]} text-center tabular-nums`}>
        {value}
      </output>

      <StepButton
        className={BUTTON_SIZE[size]}
        disabled={atMax}
        onClick={() => onChange(atMax ? value : value + 1)}
        aria-label={`${label} 늘리기`}
      >
        <path d="M7 12h10M12 7v10" />
      </StepButton>
    </div>
  );
}

function StepButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex shrink-0 items-center justify-center rounded-full border border-gray-400 bg-white text-black transition-colors active:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:active:bg-white ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
