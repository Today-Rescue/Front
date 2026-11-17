/** GET /stores/{id}/dashboard?week=YYYY-MM-DD 응답 (실제 응답 기준) */

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type DashboardResponse = {
  week_start: string; // "2026-11-16" (월요일)
  week_end: string; // "2026-11-22"
  waste: {
    this_week: number;
    last_week: number;
    change_rate: number | null; // 예: -40 (지난주 대비 %). 비교할 게 없으면 null
    reduced: number; // 덜 버린 개수
    compared_until: string | null;
  };
  discount: {
    campaign_count: number;
    target_qty: number; // 할인 대상 개수
    sold_qty: number; // 할인으로 판 개수 (= 할인으로 살린 빵)
    sale_rate: number | null; // 판매율(%)
  };
  daily_waste: {
    date: string;
    weekday: Weekday;
    this_week: number;
    last_week: number;
  }[];
  daily_comment: string; // 차트 아래 한 줄 해석
  frequent_leftovers: {
    item_id: number;
    name: string;
    image_url: string | null;
    left_days: number;
    total_days: number;
    days: { date: string; left: boolean }[];
    actions: { discount_days: number; bundle_days: number };
  }[];
  suggestion: {
    type: string; // 예: "reduce_production"
    message: string;
    item_id: number | null;
    action: unknown; // TODO: action 이 있는 응답 예시를 받으면 타입 정하기
  } | null;
};
