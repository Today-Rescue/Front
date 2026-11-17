import type { Clock } from "@/types/home";

/** "09:30" → 570 (자정부터 몇 분) */
export function clockToMinutes(clock: Clock) {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** 570 → "09:30" */
export function minutesToClock(minutes: number): Clock {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Date → 자정부터 몇 분 */
export function dateToMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

/** 235 → "3시간 55분", 180 → "3시간", 40 → "40분" */
export function formatDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}분`;
  if (rest === 0) return `${h}시간`;
  return `${h}시간 ${rest}분`;
}

/** "09:10" → "오전 9:10", "18:02" → "오후 6:02" */
export function formatAmPm(clock: Clock) {
  const total = clockToMinutes(clock);
  const h = Math.floor(total / 60);
  const m = String(total % 60).padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${m}`;
}

/** Date → "11월 08일" */
export function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}월 ${String(date.getDate()).padStart(2, "0")}일`;
}

/** 9900 → "9,900" */
export function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}
