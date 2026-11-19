"use client";

/**
 * 단위가 붙는 수량 스테퍼 (− 3개 +). ③-b 한 팩 구성에서 사용
 * 단위 없는 스테퍼는 components/scan/Stepper 를 쓴다.
 */
export default function UnitStepper({
  value,
  onChange,
  min = 0,
  max,
  unit = "개",
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  /** 스크린리더용 이름 (예: '크루아상 한 팩 수량') */
  label: string;
}) {
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 items-center">
      <StepButton disabled={atMin} onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label} 줄이기`}>
        <path d="M7 12h10" />
      </StepButton>
      <output aria-live="polite" className="min-w-14 text-center text-title-lg font-bold tabular-nums">
        {value}
        {unit}
      </output>
      <StepButton disabled={atMax} onClick={() => !atMax && onChange(value + 1)} aria-label={`${label} 늘리기`}>
        <path d="M12 7v10M7 12h10" />
      </StepButton>
    </div>
  );
}

function StepButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex size-11 items-center justify-center rounded-full border border-gray-300 bg-white text-black active:bg-gray-100 disabled:text-gray-400"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
