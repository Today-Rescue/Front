import type {
  BundleRecommendation,
  CalendarDay,
  ClosingRow,
  DiscountRate,
  LiveStatus,
  Recommendation,
  RemainingRow,
  SaleItem,
  SalesRecordDay,
} from "./types";

/**
 * ③-a 일괄 할인 mock 데이터
 * 서버가 응답하지 않을 때 보여준다. 품목 이름·가격은 백엔드 데모 데이터 기준.
 * (남은 수량·상태는 오늘 스캔이 있다고 가정한 예시 값)
 */
export const MOCK_RECOMMENDED_RATE: DiscountRate = 30;

export const MOCK_SALE_ITEMS: SaleItem[] = [
  { itemId: 8, name: "소금빵", level: "risk", remaining: 15, price: 3500, salePrice: 2450, defaultSelected: true },
  { itemId: 9, name: "크루아상", level: "risk", remaining: 12, price: 4000, salePrice: 2800, defaultSelected: true },
  { itemId: 10, name: "앙버터", level: "caution", remaining: 8, price: 5000, salePrice: 3500, defaultSelected: true },
  { itemId: 11, name: "소보로빵", level: "caution", remaining: 5, price: 2800, salePrice: 1960, defaultSelected: true },
  { itemId: 13, name: "바게트", level: "safe", remaining: 25, price: 4500, salePrice: 3150, defaultSelected: false },
  { itemId: 14, name: "올리브 치아바타", level: "safe", remaining: 20, price: 4800, salePrice: 3360, defaultSelected: false },
  { itemId: 12, name: "식빵", level: "safe", remaining: 30, price: 5500, salePrice: 3850, defaultSelected: false },
];

/**
 * ③-b 추천 세트 mock
 * TODO(B): POST /bundles/recommend 응답으로 바꾸기 (오늘 재고 스캔 전이면 서버가 400을 줘서 응답 모양 미확인)
 */
export const MOCK_BUNDLE_RECOMMENDATIONS: BundleRecommendation[] = [
  {
    name: "퇴근길 든든 팩",
    parts: [
      { itemId: 9, perPack: 3 },
      { itemId: 11, perPack: 1 },
    ],
    price: null,
  },
  {
    name: "단짠 간식 팩",
    parts: [
      { itemId: 8, perPack: 2 },
      { itemId: 10, perPack: 1 },
    ],
    price: null,
  },
];

/** ④ 마감 세일 현황 mock (디자인 시안 숫자, 품목은 백엔드 기준) */
export const MOCK_LIVE: LiveStatus = {
  discount: {
    campaignId: 0,
    rate: 30,
    endsAt: null,
    items: [
      { itemId: 10, name: "앙버터", startQty: 8, nowQty: 6 },
      { itemId: 8, name: "소금빵", startQty: 15, nowQty: 5 },
      { itemId: 9, name: "크루아상", startQty: 12, nowQty: 3 },
      { itemId: 11, name: "소보로빵", startQty: 5, nowQty: 0 },
    ],
  },
  bundle: { campaignId: 0, name: "퇴근길 든든 팩", totalPacks: 4, soldPacks: 3 },
};

/** ④-1 마감 남은 빵 확인 mock */
export const MOCK_SCAN_TIME = "18:02";
export const MOCK_REMAINING: RemainingRow[] = [
  { itemId: 8, name: "소금빵", scanQty: 15, estimatedQty: 5, recordedSold: 10 },
  { itemId: 9, name: "크루아상", scanQty: 12, estimatedQty: 2, recordedSold: 9 },
  { itemId: 10, name: "앙버터", scanQty: 8, estimatedQty: 6, recordedSold: 2 },
  { itemId: 11, name: "소보로빵", scanQty: 5, estimatedQty: 0, recordedSold: 5 },
  { itemId: 12, name: "식빵", scanQty: 30, estimatedQty: 4, recordedSold: 0 },
  { itemId: 13, name: "바게트", scanQty: 25, estimatedQty: 3, recordedSold: 0 },
  { itemId: 14, name: "올리브 치아바타", scanQty: 20, estimatedQty: 2, recordedSold: 0 },
];

/** ⑤ 오늘 마감 기록 mock (보관 기간: 소금빵~소보로빵 당일, 식빵·바게트 1일, 올리브 치아바타 2일) */
export const MOCK_CLOSING_ROWS: ClosingRow[] = [
  { itemId: 8, name: "소금빵", made: 40, left: 5, defaultChoice: "dispose" },
  { itemId: 9, name: "크루아상", made: 30, left: 2, defaultChoice: "dispose" },
  { itemId: 10, name: "앙버터", made: 28, left: 6, defaultChoice: "dispose" },
  { itemId: 11, name: "소보로빵", made: 10, left: 0, defaultChoice: "dispose" },
  { itemId: 12, name: "식빵", made: 36, left: 4, defaultChoice: "carryover" },
  { itemId: 13, name: "바게트", made: 30, left: 3, defaultChoice: "carryover" },
  { itemId: 14, name: "올리브 치아바타", made: 24, left: 2, defaultChoice: "carryover" },
];

/** ⑥ 판매 기록 mock (11/14 실제 응답 기준) */
export const MOCK_SALES_RECORD: SalesRecordDay = {
  date: "2026-11-14",
  is_confirmed: true,
  is_closed: true,
  total: { made: 208, regular_sold: 179, discount_sold: 20, carryover: 0, disposed: 9 },
  items: [
    { item_id: 8, name: "소금빵", made: 58, left: 3, regular_sold: 48, discount_sold: 7, carryover: 0, disposed: 3, sold_out: false },
    { item_id: 9, name: "크루아상", made: 39, left: 4, regular_sold: 28, discount_sold: 7, carryover: 0, disposed: 4, sold_out: false },
    { item_id: 10, name: "앙버터", made: 27, left: 0, regular_sold: 27, discount_sold: 0, carryover: 0, disposed: 0, sold_out: true },
    { item_id: 11, name: "소보로빵", made: 35, left: 1, regular_sold: 32, discount_sold: 2, carryover: 0, disposed: 1, sold_out: false },
    { item_id: 12, name: "식빵", made: 16, left: 1, regular_sold: 12, discount_sold: 3, carryover: 0, disposed: 1, sold_out: false },
    { item_id: 13, name: "바게트", made: 20, left: 0, regular_sold: 20, discount_sold: 0, carryover: 0, disposed: 0, sold_out: true },
    { item_id: 14, name: "올리브 치아바타", made: 13, left: 0, regular_sold: 12, discount_sold: 1, carryover: 0, disposed: 0, sold_out: true },
  ],
};

export const MOCK_CALENDAR: CalendarDay[] = [
  { date: "2026-11-12", made_total: 157, sold_total: 128, has_sold_out: true, is_confirmed: true },
  { date: "2026-11-13", made_total: 169, sold_total: 150, has_sold_out: true, is_confirmed: true },
  { date: "2026-11-14", made_total: 208, sold_total: 199, has_sold_out: true, is_confirmed: true },
  { date: "2026-11-15", made_total: 183, sold_total: 156, has_sold_out: true, is_confirmed: true },
];

/** ⑧ 내일 생산 추천 mock (실제 응답 기준) */
export const MOCK_RECOMMENDATION: Recommendation = {
  date: "2026-11-18",
  base_date: "2026-11-15",
  is_closed_day: false,
  total: 102,
  today_total: 183,
  change: -81,
  summary: "같은 요일 평균 기준 · 비 예보, 마감 결과 반영",
  conditions: {
    pop: 60,
    weather_change: -0.08,
    is_holiday: false,
    holiday_change: 0,
    sources: ["기상청 단기예보", "한국천문연구원 특일 정보"],
  },
  steps: [
    { label: "같은 요일 평균", total: 121 },
    { label: "날씨 보정", total: 111 },
    { label: "공휴일 보정", total: 111 },
    { label: "마감 결과 보정", total: 102 },
  ],
  items: [
    { item_id: 8, name: "소금빵", image_url: null, today_made: 45, recommended: 27, change: -18, carryover_qty: 0, tags: ["비 예보"] },
    { item_id: 9, name: "크루아상", image_url: null, today_made: 36, recommended: 18, change: -18, carryover_qty: 0, tags: ["비 예보", "8일 연속 남음"] },
    { item_id: 10, name: "앙버터", image_url: null, today_made: 25, recommended: 18, change: -7, carryover_qty: 0, tags: ["비 예보", "오늘 완판"] },
    { item_id: 11, name: "소보로빵", image_url: null, today_made: 29, recommended: 16, change: -13, carryover_qty: 0, tags: ["비 예보", "10일 연속 남음"] },
    { item_id: 12, name: "식빵", image_url: null, today_made: 15, recommended: 8, change: -7, carryover_qty: 1, tags: ["비 예보", "이월 재고"] },
    { item_id: 13, name: "바게트", image_url: null, today_made: 20, recommended: 9, change: -11, carryover_qty: 2, tags: ["비 예보", "이월 재고"] },
    { item_id: 14, name: "올리브 치아바타", image_url: null, today_made: 13, recommended: 6, change: -7, carryover_qty: 1, tags: ["비 예보", "이월 재고"] },
  ],
};
