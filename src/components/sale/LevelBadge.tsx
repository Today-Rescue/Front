import type { RiskLevel } from "./types";

const BADGE: Record<Exclude<RiskLevel, "safe">, { label: string; className: string }> = {
  risk: { label: "위험", className: "bg-error-300 text-white" },
  caution: { label: "주의", className: "bg-primary-100 text-primary-600" },
};

/** 위험·주의 뱃지 (③-a, ③-b). 여유 품목과 스캔 전 품목은 표시하지 않음 */
export default function LevelBadge({ level }: { level: RiskLevel | null }) {
  if (level === null || level === "safe") return null;
  const badge = BADGE[level];
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-caption font-semibold ${badge.className}`}>
      {badge.label}
    </span>
  );
}
