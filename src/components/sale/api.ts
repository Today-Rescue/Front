import { STORE_ID, api, storePath } from "@/lib/api";
import type {
  BundleCalc,
  CalendarDay,
  ClosingChoice,
  ClosingRow,
  Recommendation,
  SalesRecordDay,
  BundlePart,
  BundleRecommendation,
  DiscountRate,
  LiveStatus,
  RemainingRow,
  RiskLevel,
  SaleChannel,
  SaleItem,
} from "./types";

/* ------------------------------------------------------------------ */
/* 백엔드 응답 모양 (실제 응답 기준. Swagger에는 응답 형식이 없음)          */
/* ------------------------------------------------------------------ */

/** GET /stores/{id}/campaigns/discount?discount_rate=30 의 품목 하나 */
export type DiscountItemApi = {
  item_id: number;
  name: string;
  image_url: string | null;
  price: number;
  sale_price: number;
  left_qty: number | null; // 오늘 재고 스캔 전이면 null
  level: "danger" | "caution" | "safe" | null; // 오늘 재고 스캔 전이면 null
  reason: string | null; // 사장님께 그대로 보여줄 한 줄 (예: '최근 5영업일 중 3일 남았어요')
  default_selected: boolean;
};

/** POST /stores/{id}/campaigns/discount 요청 body (모두 생략 가능) */
export type DiscountCreateBody = {
  discount_rate?: number; // 생략하면 30
  item_ids?: number[]; // 생략하면 마지막 재고 스캔의 위험·주의 품목
  ends_at?: string; // 생략하면 오늘 마감 시각
};

/* ------------------------------------------------------------------ */
/* API 호출                                                             */
/* ------------------------------------------------------------------ */

export async function fetchDiscountItems(rate: DiscountRate): Promise<SaleItem[]> {
  const res = await api.get<DiscountItemApi[]>(storePath("/campaigns/discount"), {
    query: { discount_rate: rate },
  });
  return res.map(toSaleItem);
}

/** 201로 만든 세일 객체를 돌려줌. id로 판매 확정·할인율 변경·중지를 부름 */
export function createDiscount(body: DiscountCreateBody) {
  return api.post<CampaignApi>(storePath("/campaigns/discount"), body);
}

/* ------------------------------------------------------------------ */
/* 화면용 모양으로 바꾸기                                                 */
/* ------------------------------------------------------------------ */

function toSaleItem(item: DiscountItemApi): SaleItem {
  return {
    itemId: item.item_id,
    name: item.name,
    level: toRiskLevel(item.level),
    remaining: item.left_qty,
    price: item.price,
    salePrice: item.sale_price,
    defaultSelected: item.default_selected,
  };
}

/** 서버 level: danger(위험) / caution(주의) / safe(여유). 오늘 재고 스캔 전이면 null */
function toRiskLevel(level: string | null): RiskLevel | null {
  switch (level) {
    case "danger":
      return "risk";
    case "caution":
      return "caution";
    case "safe":
      return "safe";
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* ③-b 세트 구성                                                        */
/* ------------------------------------------------------------------ */

/** POST /stores/{id}/bundles/calculate 응답 (실제 응답 기준) */
type BundleCalcItemApi = {
  item_id: number;
  name: string;
  price: number;
  stock: number;
  per_pack: number;
  leftover: number;
};
type BundleCalcCoreApi = {
  items: BundleCalcItemApi[];
  packs: number;
  leftover: number;
  unit_total: number;
  recommended_price: number;
};
export type BundleCalcApi = BundleCalcCoreApi & { better: BundleCalcCoreApi | null };

/** 세트 계산 요청에 넣을 품목. qty(남은 수량)를 넣지 않으면 서버가 마지막 재고 스캔 값을 씀 */
export type BundleCalcInput = BundlePart & { qty?: number };

export async function calculateBundle(parts: BundleCalcInput[]): Promise<BundleCalc> {
  const res = await api.post<BundleCalcApi>(storePath("/bundles/calculate"), {
    items: parts.map((p) => ({ item_id: p.itemId, per_pack: p.perPack, qty: p.qty })),
  });
  return {
    packs: res.packs,
    leftover: res.leftover,
    unitTotal: res.unit_total,
    recommendedPrice: res.recommended_price,
    leftoverByItem: Object.fromEntries(res.items.map((i) => [i.item_id, i.leftover])),
    better: res.better
      ? {
          parts: res.better.items.map((i) => ({ itemId: i.item_id, perPack: i.per_pack })),
          packs: res.better.packs,
          leftover: res.better.leftover,
        }
      : null,
  };
}

/** POST /stores/{id}/bundles/recommend 응답의 추천 세트 하나 (계산 결과 모양 + name) */
type BundleRecommendApi = BundleCalcCoreApi & { name: string };

/**
 * 추천 세트.
 * - body {} → 재고 많은 품목 위주로 최대 3개
 * - body { item_ids } → 그 품목들로 1개
 * 오늘 재고 스캔 전에는 400 (BUNDLE_NOT_POSSIBLE / STOCK_UNKNOWN)
 */
export async function recommendBundles(itemIds?: number[]): Promise<BundleRecommendation[]> {
  const res = await api.post<BundleRecommendApi[]>(
    storePath("/bundles/recommend"),
    itemIds ? { item_ids: itemIds } : {},
  );
  return res.map((b) => ({
    name: b.name,
    parts: b.items.map((it) => ({ itemId: it.item_id, perPack: it.per_pack })),
    price: b.recommended_price,
  }));
}

/** POST /stores/{id}/campaigns/bundle 요청 body */
export type BundleCreateBody = {
  name: string;
  price: number;
  items: { item_id: number; per_pack: number; qty?: number }[];
  ends_at?: string; // 생략하면 오늘 마감 시각
};

/** 고른 추천의 name, 가격(추천가 또는 사장님이 고친 값), items의 item_id·per_pack을 보냄. 201로 세일 객체를 돌려줌 */
export function createBundle(body: BundleCreateBody) {
  return api.post<CampaignApi>(storePath("/campaigns/bundle"), body);
}

/**
 * 서버 없이 화면에서 계산 (서버가 응답하지 않을 때만 사용)
 * 추천가는 서버 결과와 같게 정가 합계의 60%를 100원 단위로 내림. '더 적게 남는 구성'은 서버만 계산함
 */
export function calculateBundleLocally(parts: (BundleCalcInput & { price: number })[]): BundleCalc {
  const packs = parts.length === 0 ? 0 : Math.min(...parts.map((p) => Math.floor((p.qty ?? 0) / p.perPack)));
  const leftoverByItem = Object.fromEntries(parts.map((p) => [p.itemId, (p.qty ?? 0) - packs * p.perPack]));
  const unitTotal = parts.reduce((sum, p) => sum + p.price * p.perPack, 0);
  return {
    packs,
    leftover: Object.values(leftoverByItem).reduce((s, n) => s + n, 0),
    unitTotal,
    recommendedPrice: Math.floor((unitTotal * 0.6) / 100) * 100,
    leftoverByItem,
    better: null,
  };
}

/* ------------------------------------------------------------------ */
/* ④ 마감 세일 현황 · ④-1 마감 남은 빵 확인                               */
/* ------------------------------------------------------------------ */

/** GET /stores/{id}/campaigns, GET /campaigns/{id} 의 세일 하나 (실제 응답 기준) */
export type CampaignApi = {
  id: number;
  type: "discount" | "bundle";
  bundle: unknown; // 세트 이름·팩 수는 campaigns/live 의 bundle에서 읽음
  status: "active" | "stopped" | "ended";
  discount_rate: number | null;
  channel: SaleChannel;
  started_at: string;
  ends_at: string | null;
  stopped_at: string | null;
  item_count: number;
  total_qty: number;
  items: { item_id: number; name: string; price: number; sale_price: number; start_qty: number }[];
};

/** GET /campaigns/{id}/sales 의 판매 기록 하나 (최근 순) */
export type CampaignSaleApi = {
  id: number;
  item_id: number | null;
  name: string;
  quantity: number;
  unit: "item" | "pack" | string;
  unit_price: number;
  amount: number;
  channel: SaleChannel;
  sold_at: string;
};

export function fetchCampaignSales(campaignId: number) {
  return api.get<CampaignSaleApi[]>(`/campaigns/${campaignId}/sales`);
}

/**
 * ④ 마감 세일 현황 (+ ④-1에서 쓰는 마지막 재고 스캔)
 * 오늘 세일이 없으면 discount·bundle이 null, 오늘 재고 스캔이 없으면 last_scan이 null
 */
export function fetchLiveStatus() {
  return api.get<LiveStatus>(storePath("/campaigns/live"));
}

/** 진행 중(active)인 세일 id들. 영업 종료 때 하나씩 끝냄 */
export const activeCampaignIds = (live: LiveStatus) =>
  [live.discount, live.bundle].filter((c) => c?.status === "active").map((c) => c!.campaign_id);

/**
 * ④-1 마감 남은 빵 확인. 오늘 재고 스캔이 없으면 null.
 * 처음 채워 둘 수량 = 마지막 스캔 수량 - 그 뒤 세일에서 기록된 판매 (할인 판매 + 세트 판매 × 한 팩 개수)
 * (서버가 예상 수량을 따로 주지 않음. 스캔 응답의 expected_left는 이후 판매가 반영 안 돼서 쓰지 않음)
 */
export async function fetchRemainingRows(): Promise<{
  rows: RemainingRow[];
  scannedAt: string;
  live: LiveStatus;
} | null> {
  const [live, items] = await Promise.all([fetchLiveStatus(), api.get<ItemApi[]>(storePath("/items"))]);
  if (!live.last_scan) return null;

  const names = new Map(items.map((i) => [i.id, i.name]));
  const sold = new Map<number, number>();
  for (const it of live.discount?.items ?? []) sold.set(it.item_id, (sold.get(it.item_id) ?? 0) + it.sold_qty);
  for (const part of live.bundle?.composition ?? []) {
    sold.set(part.item_id, (sold.get(part.item_id) ?? 0) + part.per_pack * live.bundle!.sold_packs);
  }

  return {
    rows: live.last_scan.items.map((it) => {
      const recordedSold = Math.min(it.quantity, sold.get(it.item_id) ?? 0);
      return {
        itemId: it.item_id,
        name: names.get(it.item_id) ?? "품목",
        scanQty: it.quantity,
        estimatedQty: it.quantity - recordedSold,
        recordedSold,
      };
    }),
    scannedAt: live.last_scan.scanned_at,
    live,
  };
}

/** 할인율 올리기 (④ '다음 한 수') */
export function updateDiscountRate(campaignId: number, rate: number) {
  return api.patch<unknown>(`/campaigns/${campaignId}`, { discount_rate: rate });
}

/**
 * 판매 확정 → 남은 수량 차감. 일괄 할인은 items, 세트는 packs
 * 지금은 서버의 차감 함수가 아직 없어서 501 APPLY_SALE_NOT_READY가 옴 (머지되면 코드 수정 없이 동작)
 */
export function recordSales(
  campaignId: number,
  body: { channel: SaleChannel; items: { item_id: number; quantity: number }[] } | { channel: SaleChannel; packs: number },
) {
  return api.post<unknown>(`/campaigns/${campaignId}/sales`, body);
}

/** 세일 끝내기 */
export function endCampaign(campaignId: number) {
  return api.patch<unknown>(`/campaigns/${campaignId}/status`, { status: "ended" });
}

/* ------------------------------------------------------------------ */
/* ⑤ 오늘 마감 기록                                                      */
/* ------------------------------------------------------------------ */

/** GET /stores/{id}/items 의 품목 하나 (필요한 부분만) */
type ItemApi = { id: number; name: string; shelf_life: "today" | "day1" | "day2" | string; is_active: boolean };

/** GET /stores/{id}/records?date= 의 품목 하나. left_qty가 null이면 미확정이라 sold_qty도 null */
type RecordApi = { item_id: number; name: string; made_qty: number; left_qty: number | null; sold_qty: number | null; sold_out: boolean };

/** GET·PUT /stores/{id}/closings/{date} 응답 */
type ClosingResultApi = {
  date: string;
  is_closed: boolean;
  items: { item_id: number; name: string; left_qty: number; disposed_qty: number; carryover_qty: number; sold_out: boolean }[];
  disposed_total: number;
  carryover_total: number;
};

/** 보관 기간이 2일 이상인지. shelf_life 값: today, day1, day2 (그 이상은 dayN 으로 온다고 가정) */
const keepsTwoDaysOrMore = (shelfLife?: string) => {
  const days = Number(shelfLife?.match(/^day(\d+)$/)?.[1] ?? 0);
  return days >= 2;
};

/**
 * ⑤ 마감 기록 화면에 보여줄 품목들.
 * 남은 수량 우선순위: ④-1에서 넘겨받은 값 → 이미 저장된 마감 기록 → 일일 기록
 * 처음 골라 둘 처리 방법: 이미 마감했으면 저장된 값, 아니면 보관 기간(당일·하루 → 폐기, 2일 이상 → 내일 판매)
 */
export async function fetchClosingRows(date: string, leftOverride: Record<number, number>) {
  const [items, records, closing] = await Promise.all([
    api.get<ItemApi[]>(storePath("/items")),
    api.get<RecordApi[]>(storePath("/records"), { query: { date } }),
    api.get<ClosingResultApi>(storePath(`/closings/${date}`)),
  ]);
  const shelfLife = new Map(items.map((i) => [i.id, i.shelf_life]));
  const closed = new Map(closing.items.map((i) => [i.item_id, i]));

  const rows: ClosingRow[] = records.map((r) => {
    const saved = closed.get(r.item_id);
    const left = leftOverride[r.item_id] ?? saved?.left_qty ?? r.left_qty;
    const defaultChoice: ClosingChoice = saved
      ? saved.carryover_qty > 0
        ? "carryover"
        : "dispose"
      : keepsTwoDaysOrMore(shelfLife.get(r.item_id))
        ? "carryover"
        : "dispose";
    return { itemId: r.item_id, name: r.name, made: r.made_qty, left, defaultChoice };
  });
  return { rows, isClosed: closing.is_closed };
}

/**
 * 남은 수량 확정 (PUT /stores/{id}/records/{date}).
 * 마감 기록과 판매 기록(정가 판매 = 만든 - 남은 - 할인 판매)은 남은 수량이 먼저 확정돼 있어야 계산됨
 */
export function saveLeftQty(date: string, items: { item_id: number; made_qty: number; left_qty: number }[]) {
  return api.put<unknown>(
    storePath(`/records/${date}`),
    items.map((i) => ({ ...i, sold_out: i.left_qty === 0 })),
  );
}

/** 마감 기록 저장 (폐기/내일 판매). 확정된 남은 수량 기준으로 폐기·이월만 저장 (판매 수는 다시 계산하지 않음) */
export function saveClosing(date: string, items: { item_id: number; disposed_qty: number; carryover_qty: number }[]) {
  return api.put<ClosingResultApi>(storePath(`/closings/${date}`), { items });
}

/* ------------------------------------------------------------------ */
/* ⑥ 판매 기록 · ⑧ 내일 생산 추천                                          */
/* ------------------------------------------------------------------ */

/** month: '2026-11' */
export function fetchCalendar(month: string) {
  return api.get<CalendarDay[]>(storePath("/records/calendar"), { query: { month } });
}

export function fetchSalesRecord(date: string) {
  return api.get<SalesRecordDay>(storePath("/sales-records"), { query: { date } });
}

/** date 생략하면 내일 추천 */
export function fetchRecommendation(date?: string) {
  return api.get<Recommendation>(storePath("/recommendations"), { query: { date } });
}

/** 가게 동 이름 (⑧ 상단 표시용) */
export async function fetchStoreDong() {
  const store = await api.get<{ dong: string }>(`/stores/${STORE_ID}`);
  return store.dong;
}
