/** 온보딩 화면에서 같이 쓰는 작은 조각들 */

export function PageIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 pt-4">
      <h2 className="text-heading-md font-bold">{title}</h2>
      {children && <p className="mt-1.5 text-body-md text-gray-700">{children}</p>}
    </div>
  );
}

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="mb-2 text-label-md font-semibold text-gray-900">
      {children}
      {required && <span className="ml-0.5 text-primary-600">*</span>}
    </p>
  );
}

export const inputClass =
  "h-14 w-full rounded-xl bg-gray-100 px-4 text-body-lg outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-primary-300";

/** 하나 또는 여러 개 고르는 버튼 (선택 = 주황 테두리 + 굵은 글자) */
export function Chip({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-12 rounded-xl border text-body-md transition-colors ${
        selected
          ? "border-primary-500 bg-primary-50 font-semibold text-primary-600"
          : "border-transparent bg-gray-100 text-gray-800"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-primary-50 px-4 py-3.5 text-body-md text-gray-900">{children}</div>
  );
}

/** 서버 요청 실패 안내 */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-center text-caption text-error-300">{children}</p>;
}
