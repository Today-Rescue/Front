import type { LiveStatus, BundleRecommendation } from "@/components/sale/types";
import type { ScanApiResponse } from "./scan";
import type { BundleSuggestion, HomeData, ScanSummary } from "@/types/home";
import { api, storePath, STORE_ID } from "./api";

/* ------------------------------------------------------------------ */
/* 1. 백엔드 응답 모양 (Swagger / 실제 응답 기준)                         */
/* ------------------------------------------------------------------ */

/** GET /stores/{id}/home */
export type HomeApiResponse = {
  date: string; // "2026-11-17"
  is_open_today: boolean;
  weather: { tmax: number; tmin: number; pop_max: number; has_rain: boolean } | null;
  is_holiday: boolean; // TODO: 오늘/내일 중 어느 날 기준인지 백엔드 확인
  /** 품목 ID별 최근 평균. 예: { "11": { made_avg: 21.5, left_avg: 3.5 } } */
  recent_avg: Record<string, { made_avg: number; left_avg: number }>;
  weekly_made: { date: string; made_total: number }[];
};

/* ------------------------------------------------------------------ */
/* 2. mock 데이터 (디자인 시안 숫자)                                     */
/*    실제 API를 붙이면 하나씩 API 값으로 바뀐다                           */
/* ------------------------------------------------------------------ */

export const MOCK_HOME: HomeData = {
  dateLabel: "11월 08일",
  store: {
    name: "한빛베이커리",
    dong: "서교동",
    openTime: "09:00",
    closeTime: "21:00",
    notifyBeforeHours: 3,
  },
  weather: { temp: 24, rainChance: 70 },
  tomorrowHoliday: true,
  firstDisplay: { time: "09:10", shelves: 3, count: 188 },
  production: [
    { itemId: 8, name: "소금빵", made: 40, extras: [{ qty: 10, time: "14:00" }] },
    { itemId: 9, name: "크루아상", made: 30, extras: [] },
    { itemId: 10, name: "단팥빵", made: 28, extras: [] },
    { itemId: 11, name: "햄치즈 샌드위치", made: 10, extras: [] },
    { itemId: 12, name: "식빵", made: 36, extras: [] },
    { itemId: 13, name: "모카번", made: 30, extras: [] },
    { itemId: 14, name: "크림빵", made: 24, extras: [] },
  ],
  lastScan: {
    time: "18:02",
    shelves: 3,
    madeTotal: 198,
    remaining: 115,
    riskKinds: 2,
    cautionKinds: 2,
    recommendedDiscount: 30,
  },
  saleLive: false,
  bundle: {
    name: "퇴근길 든든 팩",
    price: 9900,
    packs: 4,
    items: [
      { name: "크루아상", qty: 12 },
      { name: "샌드위치", qty: 5 },
    ],
  },
  bundleOnSale: false,
};

/** 첫날처럼 아무 기록도 없는 상태 (빈 화면 확인용: 주소 뒤에 ?data=empty) */
export const MOCK_HOME_EMPTY: HomeData = {
  ...MOCK_HOME,
  firstDisplay: null,
  production: [],
  lastScan: null,
  bundle: null,
};

/* ------------------------------------------------------------------ */
/* 3. API 호출 + 화면용 모양으로 바꾸기                                  */
/* ------------------------------------------------------------------ */

export function fetchHome() {
  return api.get<HomeApiResponse>(storePath("/home"));
}

/** /home 응답에서 메인 화면에 쓰는 부분만 꺼내서 덮어쓴다 */
export function mergeHomeApi(base: HomeData, res: HomeApiResponse): HomeData {
  const [, month, day] = res.date.split("-").map(Number);
  return {
    ...base,
    dateLabel: `${month}월 ${String(day).padStart(2, "0")}일`,
    weather: res.weather
      ? { temp: Math.round(res.weather.tmax), rainChance: res.weather.pop_max }
      : null,
    tomorrowHoliday: res.is_holiday,
  };
}

/* ------------------------------------------------------------------ */
/* 4. 실제 데이터로 메인 화면 만들기                                       */
/* ------------------------------------------------------------------ */

/** GET /stores/{id} */
export type StoreApiResponse = {
  id: number;
  name: string;
  dong: string;
  open_time: string; // "08:00"
  close_time: string; // "21:00"
  closed_days: string[];
  alert_hours_before: number;
};

/** GET /stores/{id}/items */
export type ItemApiResponse = {
  id: number;
  name: string;
  price: number;
  shelf_life: "today" | "day1" | "day2";
  is_active: boolean;
};

/* GET /stores/{id}/productions*/
export type ProductionsApiResponse = {
  date: string;
  made_total: number;
  items: Record<string, unknown>[];
  logs: Record<string, unknown>[];
};

type Row = Record<string, unknown>;
const num = (v: unknown) => (v === undefined || v === null || v === "" ? NaN : Number(v));
const firstNum = (row: Row, keys: string[]) => {
  for (const k of keys) {
    const n = num(row[k]);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
};

/** "2026-11-17T14:00:12+09:00" 또는 "14:00" → "14:00" */
function toClock(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const m = v.match(/(\d{2}:\d{2})/);
  return m?.[1];
}

/** 품목별 오늘 만든 수량 한 줄 → { itemId, made } */
function readRow(row: Row) {
  return {
    itemId: firstNum(row, ["item_id", "id"]),
    made: firstNum(row, ["made", "qty", "quantity", "total", "made_qty", "made_total"]),
  };
}

/** 기록 한 건 → 품목별 { source, time, itemId, qty } 여러 줄 */
function readLog(log: Row) {
  const source = String(log.source ?? log.type ?? "");
  const time = toClock(log.created_at ?? log.time ?? log.logged_at ?? log.recorded_at);
  const rows = Array.isArray(log.items) ? (log.items as Row[]) : [log];
  return rows.map((r) => ({
    source,
    time,
    itemId: firstNum(r, ["item_id", "id"]),
    qty: firstNum(r, ["qty", "quantity", "made"]),
  }));
}

export function buildHomeData(params: {
  store: StoreApiResponse;
  items: ItemApiResponse[];
  productions: ProductionsApiResponse | null;
  home: HomeApiResponse | null;
}): HomeData {
  const { store, items, productions, home } = params;
  const names = new Map(items.map((it) => [it.id, it.name]));

  // 로그를 품목별로 정리
  const logs = (productions?.logs ?? []).flatMap(readLog).filter((l) => !Number.isNaN(l.itemId));
  const madeById = new Map<number, number>();
  for (const row of (productions?.items ?? []).map(readRow)) {
    if (!Number.isNaN(row.itemId) && !Number.isNaN(row.made)) madeById.set(row.itemId, row.made);
  }
  // items 가 비어 있으면 로그를 더해서 계산 ('edit'은 그 값으로 덮어쓰기)
  if (madeById.size === 0) {
    for (const l of logs) {
      if (Number.isNaN(l.qty)) continue;
      const prev = madeById.get(l.itemId) ?? 0;
      madeById.set(l.itemId, l.source === "edit" ? l.qty : prev + l.qty);
    }
  }

  const production = [...madeById.entries()]
    .filter(([, made]) => made > 0)
    .map(([itemId, made]) => ({
      itemId,
      name: names.get(itemId) ?? `품목 ${itemId}`,
      made,
      extras: logs
        .filter((l) => l.itemId === itemId && l.source === "extra" && l.time && !Number.isNaN(l.qty))
        .map((l) => ({ qty: l.qty, time: l.time! })),
    }))
    // 등록 순서대로
    .sort((a, b) => items.findIndex((i) => i.id === a.itemId) - items.findIndex((i) => i.id === b.itemId));

  const initial = logs.filter((l) => l.source === "initial");
  const firstDisplay =
    initial.length > 0
      ? {
          time: initial.map((l) => l.time).filter(Boolean).sort()[0] ?? "09:00",
          count: initial.reduce((s, l) => s + (Number.isNaN(l.qty) ? 0 : l.qty), 0),
        }
      : production.length > 0
        ? // 로그는 없는데 수량은 있으면 (직접 입력 등) 총량만 보여줌
          { time: "", count: production.reduce((s, r) => s + r.made, 0) }
        : null;

  const base: HomeData = {
    dateLabel: "",
    store: {
      name: store.name,
      dong: store.dong,
      openTime: store.open_time.slice(0, 5),
      closeTime: store.close_time.slice(0, 5),
      notifyBeforeHours: Math.min(3, Math.max(1, store.alert_hours_before)) as 1 | 2 | 3,
    },
    weather: null,
    tomorrowHoliday: false,
    firstDisplay,
    production,
    // 마지막 마감 스캔 · 세일 · 세트 추천은 useHomeData 에서 buildClosing 으로 따로 불러와 채움
    lastScan: null,
    saleLive: false,
    bundle: null,
    bundleOnSale: false,
  };

  if (home) return mergeHomeApi(base, home);
  const today = productions?.date ?? new Date().toISOString().slice(0, 10);
  const [, m, d] = today.split("-").map(Number);
  return { ...base, dateLabel: `${m}월 ${String(d).padStart(2, "0")}일` };
}

export const fetchStore = () => api.get<StoreApiResponse>(`/stores/${STORE_ID}`);
export const fetchStoreItems = () => api.get<ItemApiResponse[]>(storePath("/items"));
export const fetchProductions = () => api.get<ProductionsApiResponse>(storePath("/productions"));

/* ------------------------------------------------------------------ */
/* 5. ① 마감 모드: 마지막 스캔 · 진행 중인 세일 · 세트                       */
/*    (API 함수는 A의 lib/scan.ts, B의 components/sale/api.ts 것을 그대로 씀) */
/* ------------------------------------------------------------------ */

export type ClosingSources = {
  live: LiveStatus | null; // GET /stores/{id}/campaigns/live
  scan: ScanApiResponse | null; // GET /scans/{last_scan.scan_id} (위험·주의 품목 수)
  recommendation: BundleRecommendation | null; // POST /bundles/recommend 첫 번째
  items: ItemApiResponse[];
  madeTotal: number;
};

/** 마지막 스캔 수량 - 그 뒤 세일에서 기록된 판매 (백엔드 안내 기준) */
function remainingAfterSales(live: LiveStatus) {
  const scan = live.last_scan!;
  const sold = new Map<number, number>();
  for (const it of live.discount?.items ?? []) sold.set(it.item_id, (sold.get(it.item_id) ?? 0) + it.sold_qty);
  for (const part of live.bundle?.composition ?? []) {
    sold.set(part.item_id, (sold.get(part.item_id) ?? 0) + part.per_pack * live.bundle!.sold_packs);
  }
  return scan.items.reduce((sum, it) => sum + Math.max(0, it.quantity - (sold.get(it.item_id) ?? 0)), 0);
}

export function buildClosing({ live, scan, recommendation, items, madeTotal }: ClosingSources): Pick<
  HomeData,
  "lastScan" | "saleLive" | "bundle" | "bundleOnSale"
> {
  const lastScan: ScanSummary | null = live?.last_scan
    ? {
        time: toClock(live.last_scan.scanned_at) ?? "",
        madeTotal,
        remaining: remainingAfterSales(live),
        riskKinds: scan?.risk_summary.danger.item_count ?? 0,
        cautionKinds: scan?.risk_summary.caution.item_count ?? 0,
        recommendedDiscount: live.discount?.discount_rate ?? 30,
      }
    : null;

  const itemNames = new Map(items.map((it) => [it.id, it.name]));
  const itemPrices = new Map(items.map((it) => [it.id, it.price]));
  let bundle: BundleSuggestion | null = null;
  if (live?.bundle) {
    // 이미 올린 세트
    bundle = {
      name: live.bundle.name,
      price: live.bundle.price,
      packs: live.bundle.packs,
      items: live.bundle.composition.map((c) => ({ name: c.name, qty: c.per_pack * live.bundle!.packs })),
    };
  } else if (recommendation && live?.last_scan) {
    // 추천 세트: 마지막 스캔 수량으로 몇 팩 나오는지 계산
    const qty = new Map(live.last_scan.items.map((it) => [it.item_id, it.quantity]));
    const packs = Math.min(...recommendation.parts.map((p) => Math.floor((qty.get(p.itemId) ?? 0) / p.perPack)));
    if (packs > 0) {
      bundle = {
        name: recommendation.name,
        // 추천가가 없으면 정가 합계의 60%를 100원 단위로 내림 (B 화면과 같은 계산)
        price:
          recommendation.price ??
          Math.floor(
            (recommendation.parts.reduce((sum, p) => sum + (itemPrices.get(p.itemId) ?? 0) * p.perPack, 0) * 0.6) / 100,
          ) * 100,
        packs,
        items: recommendation.parts.map((p) => ({ name: itemNames.get(p.itemId) ?? "품목", qty: p.perPack * packs })),
        parts: recommendation.parts,
      };
    }
  }

  return {
    lastScan,
    saleLive: live?.discount?.status === "active",
    bundle,
    bundleOnSale: live?.bundle?.status === "active",
  };
}
