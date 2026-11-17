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
  level: string | null; // 오늘 재고 스캔 전이면 null
  reason: string | null;
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

export function createDiscount(body: DiscountCreateBody) {
  // TODO(B): 응답 모양 확인 후 타입 지정 (생성된 campaign id를 ④에서 쓸 수 있음)
  return api.post<unknown>(storePath("/campaigns/discount"), body);
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

/**
 * 서버의 level 값을 화면용으로 바꾼다.
 * TODO(B): 실제 값 목록을 백엔드에 확인 (스캔 전이라 아직 null만 받아 봄)
 */
function toRiskLevel(level: string | null): RiskLevel | null {
  switch (level?.toLowerCase()) {
    case "risk":
    case "danger":
    case "high":
    case "위험":
      return "risk";
    case "caution":
    case "warning":
    case "medium":
    case "주의":
      return "caution";
    case "safe":
    case "ok":
    case "low":
    case "여유":
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

/**
 * 추천 세트 최대 3개.
 * TODO(B): 응답 모양 확인 후 정리. 오늘 재고 스캔 전에는 400(BUNDLE_NOT_POSSIBLE / STOCK_UNKNOWN)이라
 * 아직 성공 응답을 받아 보지 못해서, 배열이든 { bundles: [...] }든 받을 수 있게 해 둠
 */
export async function recommendBundles(itemIds?: number[]): Promise<BundleRecommendation[]> {
  const res = await api.post<unknown>(storePath("/bundles/recommend"), itemIds ? { item_ids: itemIds } : {});
  const obj = res as Record<string, unknown> | null;
  const list = Array.isArray(res) ? res : (obj?.bundles ?? obj?.recommendations ?? []);
  if (!Array.isArray(list)) return [];

  return list.map((raw, i) => {
    const b = raw as {
      name?: string;
      price?: number;
      recommended_price?: number;
      items?: { item_id: number; per_pack: number }[];
    };
    return {
      name: b.name ?? `추천 세트 ${i + 1}`,
      parts: (b.items ?? []).map((it) => ({ itemId: it.item_id, perPack: it.per_pack })),
      price: b.price ?? b.recommended_price ?? null,
    };
  });
}

/** POST /stores/{id}/campaigns/bundle 요청 body */
export type BundleCreateBody = {
  name: string;
  price: number;
  items: { item_id: number; per_pack: number; qty?: number }[];
  ends_at?: string; // 생략하면 오늘 마감 시각
};

export function createBundle(body: BundleCreateBody) {
  // TODO(B): 응답 모양 확인 후 타입 지정 (생성된 campaign id를 ④에서 쓸 수 있음)
  return api.post<unknown>(storePath("/campaigns/bundle"), body);
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
  bundle: { name?: string; packs?: number; total_packs?: number } | null; // TODO(B): 세트 세일 응답 모양 확인
  status: string; // 확인된 값: "ended". 진행 중 값은 아직 못 받아 봄
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

const isActive = (c: CampaignApi) => c.status !== "ended" && c.status !== "stopped";

/** 오늘 세일 중 진행 중인 것 (없으면 가장 최근 것) */
async function fetchTodayCampaigns() {
  const list = await api.get<CampaignApi[]>(storePath("/campaigns"));
  const pick = (type: CampaignApi["type"]) => {
    const ofType = list.filter((c) => c.type === type);
    return ofType.find(isActive) ?? ofType.at(-1) ?? null;
  };
  return { discount: pick("discount"), bundle: pick("bundle") };
}

export function fetchCampaignSales(campaignId: number) {
  return api.get<CampaignSaleApi[]>(`/campaigns/${campaignId}/sales`);
}

/** 품목별 판매 수 합계 */
const soldByItem = (sales: CampaignSaleApi[]) => {
  const map = new Map<number, number>();
  for (const s of sales) {
    if (s.item_id !== null && s.unit !== "pack") map.set(s.item_id, (map.get(s.item_id) ?? 0) + s.quantity);
  }
  return map;
};

/**
 * ④ 마감 세일 현황. 오늘 세일이 하나도 없으면 null.
 * TODO(B): GET /stores/{id}/campaigns/live 응답 모양을 받으면 그걸로 바꾸기.
 *   지금은 오늘 세일이 없어 null만 받아 봐서, 응답 모양을 아는 세일 목록 + 판매 내역으로 계산함
 */
export async function fetchLiveStatus(): Promise<LiveStatus | null> {
  const { discount, bundle } = await fetchTodayCampaigns();
  if (!discount && !bundle) return null;

  const [discountSales, bundleSales] = await Promise.all([
    discount ? fetchCampaignSales(discount.id) : Promise.resolve([]),
    bundle ? fetchCampaignSales(bundle.id) : Promise.resolve([]),
  ]);
  const sold = soldByItem(discountSales);

  return {
    discount: discount && {
      campaignId: discount.id,
      rate: discount.discount_rate ?? 0,
      endsAt: discount.ends_at,
      items: discount.items.map((it) => ({
        itemId: it.item_id,
        name: it.name,
        startQty: it.start_qty,
        nowQty: Math.max(0, it.start_qty - (sold.get(it.item_id) ?? 0)),
      })),
    },
    bundle: bundle && {
      campaignId: bundle.id,
      name: bundle.bundle?.name ?? "세트",
      totalPacks: bundle.bundle?.total_packs ?? bundle.bundle?.packs ?? null,
      soldPacks: bundleSales.filter((s) => s.unit === "pack").reduce((sum, s) => sum + s.quantity, 0),
    },
  };
}

/**
 * ④-1 마감 남은 빵 확인. 마지막 재고 스캔 수량이 없으면 null.
 * 처음 채워 둘 수량 = 스캔 수량 - 세일 중 기록된 판매
 * TODO(B): 판매 속도로 예상한 수량을 서버가 주면 그 값으로 바꾸기 (스캔 시각도 함께)
 */
export async function fetchRemainingRows(): Promise<{ rows: RemainingRow[]; discountCampaignId: number | null; activeCampaignIds: number[] } | null> {
  const [items, campaigns] = await Promise.all([
    api.get<DiscountItemApi[]>(storePath("/campaigns/discount")),
    fetchTodayCampaigns(),
  ]);
  if (items.every((it) => it.left_qty === null)) return null;

  const sales = campaigns.discount ? await fetchCampaignSales(campaigns.discount.id) : [];
  const sold = soldByItem(sales);

  return {
    rows: items
      .filter((it) => it.left_qty !== null)
      .map((it) => {
        const scanQty = it.left_qty ?? 0;
        const recordedSold = Math.min(scanQty, sold.get(it.item_id) ?? 0);
        return { itemId: it.item_id, name: it.name, scanQty, estimatedQty: scanQty - recordedSold, recordedSold };
      }),
    discountCampaignId: campaigns.discount && isActive(campaigns.discount) ? campaigns.discount.id : null,
    activeCampaignIds: [campaigns.discount, campaigns.bundle]
      .filter((c): c is CampaignApi => c !== null && isActive(c))
      .map((c) => c.id),
  };
}

/** 할인율 올리기 (④ '다음 한 수') */
export function updateDiscountRate(campaignId: number, rate: number) {
  return api.patch<unknown>(`/campaigns/${campaignId}`, { discount_rate: rate });
}

/** 판매 확정 → 남은 수량 차감. 일괄 할인은 items, 세트는 packs */
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

/**
 * ⑤ 마감 기록 화면에 보여줄 품목들.
 * 남은 수량 우선순위: ④-1에서 넘겨받은 값 → 이미 저장된 마감 기록 → 일일 기록
 * 처음 골라 둘 처리 방법: 이미 마감했으면 저장된 값, 아니면 보관 기간(당일 → 폐기, 1~2일 → 내일 판매)
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
      : shelfLife.get(r.item_id) === "today"
        ? "dispose"
        : "carryover";
    return { itemId: r.item_id, name: r.name, made: r.made_qty, left, defaultChoice };
  });
  return { rows, isClosed: closing.is_closed };
}

/** 마감 기록 저장 (폐기/내일 판매). 남은 수량 = 폐기 + 내일 판매 */
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
