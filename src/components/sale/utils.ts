import type { RiskLevel, SaleItem } from "./types";

/** 위험 → 주의 → 여유 → (스캔 전) 순서 */
const LEVEL_ORDER: Record<RiskLevel, number> = { risk: 0, caution: 1, safe: 2 };

export const sortByLevel = (items: SaleItem[]) =>
  [...items].sort((a, b) => (a.level ? LEVEL_ORDER[a.level] : 3) - (b.level ? LEVEL_ORDER[b.level] : 3));

/** 받침 있으면 '이', 없으면 '가'. 예: '앙버터가', '소금빵이' */
export const withSubject = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasBatchim ? "이" : "가"}`;
};

/** ISO 시각 → 지금부터 몇 분 남았는지 (지났으면 0) */
export const minutesUntil = (iso: string, now: Date) =>
  Math.max(0, Math.round((new Date(iso).getTime() - now.getTime()) / 60_000));

/** 9900 → '9,900원' */
export const formatWon = (won: number) => `${won.toLocaleString("ko-KR")}원`;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** Date → '2026-11-17' (기기 시간대 기준) */
export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** '2026-11-17' → Date (기기 시간대 0시) */
export const fromDateKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** '2026-11-08' → '월' 같은 요일 한 글자 */
export const weekdayOf = (key: string) => WEEKDAYS[fromDateKey(key).getDay()];

/** '2026-11-08' → '11월 8일 (토)' */
export const formatDateLabel = (key: string, withWeekday = true) => {
  const d = fromDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일${withWeekday ? ` (${WEEKDAYS[d.getDay()]})` : ""}`;
};

/** ④-1 → ⑤로 남은 수량 넘길 때 주소에 쓰는 모양. { 8: 5, 9: 2 } → '8:5,9:2' */
export const toLeftParam = (left: Record<number, number>) =>
  Object.entries(left)
    .map(([id, qty]) => `${id}:${qty}`)
    .join(",");

/** '8:5,9:2' → { 8: 5, 9: 2 } */
export const parseLeftParam = (value?: string): Record<number, number> =>
  Object.fromEntries(
    (value ?? "")
      .split(",")
      .map((pair) => pair.split(":").map(Number))
      .filter(([id, qty]) => Number.isInteger(id) && Number.isInteger(qty) && qty >= 0),
  );
