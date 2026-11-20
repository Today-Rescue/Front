import type { DashboardResponse } from "@/types/dashboard";
import { api, storePath, STORE_ID } from "./api";

/** 대시보드 데이터. week 를 주면 그 주, 안 주면 이번 주 */
export function fetchDashboard(week?: string) {
  return api.get<DashboardResponse>(storePath("/dashboard"), { query: { week } });
}

/** 쉬는 날 (차트에서 뺄 요일). 실패하면 빈 배열 → 7일 다 보여줌 */
export async function fetchClosedDays(): Promise<string[]> {
  try {
    const store = await api.get<{ closed_days?: string[] }>(`/stores/${STORE_ID}`);
    return store.closed_days ?? [];
  } catch {
    return [];
  }
}

/** "2026-11-16" → "11월 16일" */
export function formatDateKo(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일`;
}

/** 기간 표시: "11월 16일 – 22일" (달이 바뀌면 "11월 30일 – 12월 6일") */
export function formatWeekRange(start: string, end: string) {
  const [, sm] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  return sm === em ? `${formatDateKo(start)} – ${ed}일` : `${formatDateKo(start)} – ${formatDateKo(end)}`;
}

/** 서버가 안 될 때·디자인 확인용 (?mock=1) - 디자인 시안 숫자 */
export const MOCK_DASHBOARD: DashboardResponse = {
  week_start: "2026-11-02",
  week_end: "2026-11-08",
  waste: { this_week: 62, last_week: 104, change_rate: -0.4, reduced: 42, compared_until: null },
  discount: { campaign_count: 5, target_qty: 210, sold_qty: 142, sale_rate: 0.68 },
  daily_waste: [
    { date: "2026-11-02", weekday: "mon", this_week: 18, last_week: 32 },
    { date: "2026-11-03", weekday: "tue", this_week: 12, last_week: 26 },
    { date: "2026-11-04", weekday: "wed", this_week: 9, last_week: 24 },
    { date: "2026-11-05", weekday: "thu", this_week: 7, last_week: 29 },
    { date: "2026-11-06", weekday: "fri", this_week: 16, last_week: 24 },
    { date: "2026-11-07", weekday: "sat", this_week: 0, last_week: 0 },
    { date: "2026-11-08", weekday: "sun", this_week: 0, last_week: 0 },
  ],
  daily_comment: "금요일 폐기가 다시 늘었어요. 내일이 공휴일이라 손님이 적었던 영향일 수 있어요.",
  frequent_leftovers: [
    {
      item_id: 10,
      name: "단팥빵",
      image_url: null,
      left_days: 5,
      total_days: 5,
      days: [true, true, true, true, true].map((left, i) => ({ date: `2026-11-0${i + 2}`, left })),
      actions: { discount_days: 3, bundle_days: 0 },
    },
    {
      item_id: 13,
      name: "모카번",
      image_url: null,
      left_days: 4,
      total_days: 5,
      days: [true, true, false, true, true].map((left, i) => ({ date: `2026-11-0${i + 2}`, left })),
      actions: { discount_days: 2, bundle_days: 1 },
    },
    {
      item_id: 8,
      name: "소금빵",
      image_url: null,
      left_days: 3,
      total_days: 5,
      days: [true, false, true, false, true].map((left, i) => ({ date: `2026-11-0${i + 2}`, left })),
      actions: { discount_days: 0, bundle_days: 0 },
    },
  ],
  suggestion: {
    type: "reduce_production",
    message: "단팥빵이 최근 5영업일 중 5일 남았어요. 내일 생산 추천을 확인해 보세요",
    item_id: 10,
    action: null,
  },
};
