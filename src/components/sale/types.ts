/** 스캔 결과의 품목 상태. 위험 → 주의 → 여유 순으로 정렬해서 보여준다 */
export type RiskLevel = "risk" | "caution" | "safe";

/** 할인할 수 있는 남은 재고 품목 (화면에서 쓰는 모양) */
export type SaleItem = {
  itemId: number;
  name: string;
  /** 오늘 재고 스캔 전이면 null */
  level: RiskLevel | null;
  /** 남은 수량. 오늘 재고 스캔 전이면 null */
  remaining: number | null;
  price: number;
  salePrice: number;
  /** 처음 들어왔을 때 체크해 둘지 (서버 추천) */
  defaultSelected: boolean;
};

/** ③-a에서 고를 수 있는 할인율(%) */
export const DISCOUNT_RATES = [20, 30, 40, 50] as const;
export type DiscountRate = (typeof DISCOUNT_RATES)[number];

/**
 * 판매 채널
 * - app: 오늘구조대 판매 (사장님이 앱에 올린 마감 세일을 보고 구매) → 화면 표시 '오늘구조대'
 * - store: 매장 자체 판매 (손님이 매장에서 바로 결제) → 화면 표시 '매장'
 */
export type SaleChannel = "app" | "store";

export const CHANNEL_LABEL: Record<SaleChannel, string> = {
  app: "오늘구조대",
  store: "매장",
};

/** 세트 한 팩에 들어가는 품목 하나 */
export type BundlePart = {
  itemId: number;
  /** 한 팩에 몇 개 */
  perPack: number;
};

/** 추천 세트 (③-b 상단 칩) */
export type BundleRecommendation = {
  name: string;
  parts: BundlePart[];
  /** 추천 팩 가격(원). 모르면 null → 계산 결과의 추천가 사용 */
  price: number | null;
};

/** 세트 계산 결과 (POST /bundles/calculate) */
export type BundleCalc = {
  /** 만들 수 있는 팩 수 */
  packs: number;
  /** 팩을 만들고 남는 빵 수 */
  leftover: number;
  /** 한 팩 정가 합계(원) */
  unitTotal: number;
  /** 추천 팩 가격(원) */
  recommendedPrice: number;
  /** 품목별 남는 수 */
  leftoverByItem: Record<number, number>;
  /** 더 적게 남는 구성. 없으면 null */
  better: { parts: BundlePart[]; packs: number; leftover: number } | null;
};

/** ④ 마감 세일 현황 (GET /stores/{id}/campaigns/live 응답 그대로) */
export type LiveDiscountItem = {
  item_id: number;
  name: string;
  image_url: string | null;
  sale_price: number;
  /** 세일 시작 때 수량 */
  start_qty: number;
  sold_qty: number;
  /** 지금 남은 수량 */
  left_qty: number;
  sold_out: boolean;
  /** 거의 안 팔리는 품목 */
  slow: boolean;
};

export type LiveStatus = {
  minutes_to_close: number | null;
  /** 오늘 마지막 재고 스캔. 오늘 스캔이 없으면 null */
  last_scan: {
    scan_id: number;
    scanned_at: string;
    total_quantity: number;
    items: { item_id: number; quantity: number }[];
  } | null;
  discount: {
    campaign_id: number;
    status: "active" | "stopped" | "ended";
    discount_rate: number;
    target_qty: number;
    sold_qty: number;
    /** 0~1 (sold_qty ÷ target_qty) */
    progress: number;
    channels: Record<SaleChannel, number>;
    items: LiveDiscountItem[];
    /** 다음 한 수. 세일 전체 할인율을 next_rate로 올리기 제안 (item_ids = 느린 품목) */
    suggestion: { type: "raise_rate"; item_ids: number[]; next_rate: number } | null;
  } | null;
  bundle: {
    campaign_id: number;
    status: "active" | "stopped" | "ended";
    name: string;
    price: number;
    /** 전체 팩 */
    packs: number;
    sold_packs: number;
    left_packs: number;
    progress: number;
    /** 채널별 판매 팩 수 */
    channels: Record<SaleChannel, number>;
    composition: { item_id: number; name: string; per_pack: number }[];
  } | null;
};

/** ④-1 마감 남은 빵 확인의 품목 한 줄 */
export type RemainingRow = {
  itemId: number;
  name: string;
  /** 마지막 재고 스캔 때 수량 */
  scanQty: number;
  /** 판매 속도로 예상한 지금 남은 수량 (처음 채워 둘 값) */
  estimatedQty: number;
  /** 세일 중 이미 기록된 판매 수 (오늘구조대·매장) */
  recordedSold: number;
};

/** ⑤ 남은 빵 처리 방법: 폐기 / 내일 판매(이월) */
export type ClosingChoice = "dispose" | "carryover";

/** ⑤ 오늘 마감 기록의 품목 한 줄 */
export type ClosingRow = {
  itemId: number;
  name: string;
  made: number;
  /** 남은 수량. 아직 확인 전이면 null */
  left: number | null;
  /** 처음 골라 둘 처리 방법 (보관 기간 기준, 이미 마감했으면 저장된 값) */
  defaultChoice: ClosingChoice;
};

/** ⑥ 판매 기록 하루치 (GET /sales-records 응답 그대로) */
export type SalesRecordDay = {
  date: string;
  is_confirmed: boolean;
  is_closed: boolean;
  total: { made: number; regular_sold: number; discount_sold: number; carryover: number; disposed: number };
  items: {
    item_id: number;
    name: string;
    made: number;
    left: number | null;
    regular_sold: number | null;
    discount_sold: number;
    carryover: number | null;
    disposed: number | null;
    sold_out: boolean;
  }[];
};

/** ⑥ 달력 날짜별 요약 (GET /records/calendar 응답 그대로) */
export type CalendarDay = {
  date: string;
  made_total: number;
  sold_total: number;
  has_sold_out: boolean;
  is_confirmed: boolean;
};

/** ⑧ 내일 생산 추천 (GET /recommendations 응답 그대로) */
export type Recommendation = {
  date: string;
  base_date: string;
  is_closed_day: boolean;
  total: number;
  today_total: number;
  change: number;
  summary: string;
  conditions: {
    pop: number | null;
    weather_change: number;
    is_holiday: boolean;
    holiday_change: number;
    sources: string[];
  };
  /** 첫 단계는 change_rate가 null. 기록이 부족하면 첫 단계 label이 '오늘 판매' */
  steps: { label: string; total: number; change_rate: number | null }[];
  items: {
    item_id: number;
    name: string;
    image_url: string | null;
    today_made: number;
    recommended: number;
    change: number;
    carryover_qty: number;
    tags: string[];
  }[];
};
