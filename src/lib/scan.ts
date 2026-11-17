import type { ScanPurpose } from "@/components/scan/types";
import { api, storePath } from "./api";

/**
 * 촬영·스캔(A) API 모음
 * 응답 모양은 데모 서버를 직접 호출해서 확인한 값 기준이다 (Swagger에는 응답 모양이 없음).
 */

/* ------------------------------------------------------------------ */
/* 1. 서버 응답 모양                                                    */
/* ------------------------------------------------------------------ */

/** ok = 모두 인식, partial = 일부만, failed = 하나도 못 찾음, timeout = 20초 초과·통신 실패, too_dark = 사진이 어두움 */
export type ScanStatus = "ok" | "partial" | "failed" | "timeout" | "too_dark";

/** 서버의 위험도. 화면의 '여유'는 safe */
export type ApiLevel = "danger" | "caution" | "safe";

export type ScanApiItem = {
  item_id: number;
  name: string;
  image_url: string | null;
  shelf_life: "today" | "day1" | "day2";
  /** 사진에서 찾았는지 */
  found: boolean;
  /** 확정 대상 수량 (못 찾았으면 0) */
  quantity: number;
  detected_qty: number | null;
  confidence: number | null;
  /** 개수 확인 필요 (못 찾았거나 일부 가려짐) */
  needs_check: boolean;
  level: ApiLevel;
  expected_left: number;
  /** 위험도 이유 (예: '오늘 소비기한 · 마감 때 약 15개 남을 것 같아요') */
  reason: string;
};

export type RiskGroup = { item_count: number; quantity: number };

/** POST /stores/{id}/scans, GET /scans/{id}, POST /scans/{id}/risk 가 같은 모양으로 돌려줌 */
export type ScanApiResponse = {
  scan_id: number;
  purpose: ScanPurpose;
  status: ScanStatus;
  image_url: string;
  /** "2026-11-17T20:18+09:00" */
  scanned_at: string;
  found_count: number;
  total_count: number;
  total_quantity: number;
  risk_summary: Record<ApiLevel, RiskGroup>;
  items: ScanApiItem[];
};

type StoreInfo = { close_time: string; alert_hours_before: number };
type ApiItem = { id: number; name: string; image_url: string | null; shelf_life: ScanApiItem["shelf_life"] };

/* ------------------------------------------------------------------ */
/* 2. API 호출                                                         */
/* ------------------------------------------------------------------ */

/** 촬영 목적 추천 (마감 알림 시각 전 = open, 이후 = close) */
export async function fetchScanPurpose(): Promise<ScanPurpose> {
  const res = await api.get<{ recommended: ScanPurpose }>(storePath("/scans/purpose"));
  return res.recommended;
}

/** 마감 알림 시각 'HH:mm' (마감 시각 - 몇 시간 전). 목적 선택 시트 안내 문구에 씀 */
export async function fetchNotifyTime(): Promise<string> {
  const store = await api.get<StoreInfo>(storePath(""));
  const [h, m] = store.close_time.split(":").map(Number);
  const total = (((h * 60 + m - store.alert_hours_before * 60) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** 사진 한 장 올리기. 서버는 한 번에 한 장만 분석함 */
export function uploadScan(photo: Blob, purpose: ScanPurpose, signal?: AbortSignal) {
  const form = new FormData();
  form.append("image", photo, "shelf.jpg");
  form.append("purpose", purpose);
  return api.post<ScanApiResponse>(storePath("/scans"), form, { signal });
}

export function getScan(scanId: number, signal?: AbortSignal) {
  return api.get<ScanApiResponse>(`/scans/${scanId}`, { signal });
}

/** 확정 전에 수정한 수량으로 총 재고·위험도를 다시 계산 (저장하지 않음) */
export function recalcRisk(scanId: number, items: { item_id: number; quantity: number }[], signal?: AbortSignal) {
  return api.post<ScanApiResponse>(`/scans/${scanId}/risk`, { items }, { signal });
}

/** 수량 확정. open = 오늘 만든 수량, close = 남은 수량으로 저장됨 */
export function confirmScan(scanId: number, purpose: ScanPurpose, items: { item_id: number; quantity: number }[]) {
  return api.post(`/scans/${scanId}/confirm`, { date: todayLocal(), purpose, items });
}

/** 만든 수량 기록. initial = 최초 진열, extra = 추가 생산, edit = 직접 수정 */
export function createProduction(source: "initial" | "extra" | "edit", rows: { item_id: number; qty: number }[]) {
  return api.post(storePath("/productions"), { date: todayLocal(), source, items: rows });
}

export function fetchItems() {
  return api.get<ApiItem[]>(storePath("/items"));
}

/**
 * 오늘 품목별 만든 수량 { 품목ID → 수량 }
 * TODO: 응답의 items가 비어 있어서 모양을 확인하지 못함. 값이 나오면 필드 이름 확인
 */
export async function fetchMadeToday(): Promise<Map<number, number>> {
  const res = await api.get<{ items?: Record<string, unknown>[] }>(storePath("/productions"));
  const map = new Map<number, number>();
  for (const row of res.items ?? []) {
    const id = Number(row.item_id);
    const qty = Number(row.qty ?? row.quantity ?? row.total ?? row.made ?? 0);
    if (!Number.isNaN(id)) map.set(id, qty);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* 3. 여러 장 합치기 / 사진 없이 직접 입력                                 */
/* ------------------------------------------------------------------ */

/**
 * 촬영한 사진들을 분석해서 하나의 결과로 돌려줌.
 * 서버가 한 장씩만 분석해서, 장마다 올린 뒤 품목별 수량을 더하고 서버에 위험도를 다시 계산시킨다.
 */
export async function analyzePhotos(photos: Blob[], purpose: ScanPurpose, signal?: AbortSignal): Promise<ScanApiResponse> {
  const scans = await Promise.all(photos.map((photo) => uploadScan(photo, purpose, signal)));
  return scans.length === 1 ? scans[0] : mergeScans(scans, signal);
}

async function mergeScans(scans: ScanApiResponse[], signal?: AbortSignal): Promise<ScanApiResponse> {
  const first = scans[0];
  const sums = new Map<number, number>();
  const found = new Set<number>();
  for (const scan of scans) {
    for (const item of scan.items) {
      if (!item.found) continue;
      found.add(item.item_id);
      sums.set(item.item_id, (sums.get(item.item_id) ?? 0) + item.quantity);
    }
  }

  const recalculated = await recalcRisk(
    first.scan_id,
    first.items.map((item) => ({ item_id: item.item_id, quantity: sums.get(item.item_id) ?? 0 })),
    signal,
  );

  const items = recalculated.items.map((item) => ({
    ...item,
    found: found.has(item.item_id),
    needs_check: !found.has(item.item_id) || item.needs_check,
  }));
  const status: ScanStatus =
    found.size === 0
      ? scans.every((scan) => scan.status === "too_dark")
        ? "too_dark"
        : "failed"
      : found.size < items.length
        ? "partial"
        : "ok";

  return { ...recalculated, status, found_count: found.size, total_count: items.length, items };
}

/**
 * 사진 없이 직접 입력할 때 쓰는 빈 결과 (등록 품목 전부, 수량 0).
 * scan_id는 0 = 서버에 스캔이 없다는 뜻
 */
export async function blankScan(purpose: ScanPurpose): Promise<ScanApiResponse> {
  const items = await fetchItems();
  return {
    scan_id: 0,
    purpose,
    status: "failed",
    image_url: "",
    scanned_at: new Date().toISOString(),
    found_count: 0,
    total_count: items.length,
    total_quantity: 0,
    risk_summary: {
      danger: { item_count: 0, quantity: 0 },
      caution: { item_count: 0, quantity: 0 },
      safe: { item_count: items.length, quantity: 0 },
    },
    items: items.map((item) => ({
      item_id: item.id,
      name: item.name,
      image_url: item.image_url,
      shelf_life: item.shelf_life,
      found: false,
      quantity: 0,
      detected_qty: null,
      confidence: null,
      needs_check: true,
      level: "safe",
      expected_left: 0,
      reason: "",
    })),
  };
}

/* ------------------------------------------------------------------ */
/* 4. 화면 사이에 결과 넘기기 (새로고침해도 유지: sessionStorage)            */
/* ------------------------------------------------------------------ */

const SESSION_KEY = "today-rescue:scan-session";

export type ScanSession = { scan: ScanApiResponse; photoCount: number };

export function saveScanSession(session: ScanSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // 저장이 막혀 있으면(시크릿 모드 등) 주소의 scan 값으로 서버에서 다시 불러옴
  }
}

export function loadScanSession(): ScanSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ScanSession) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 5. 표시용 도우미                                                     */
/* ------------------------------------------------------------------ */

/** 오늘 날짜 'YYYY-MM-DD' (기기 시간 기준) */
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** '2026-11-17T20:18+09:00' → '오후 8:18' */
export function formatScanTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
}
