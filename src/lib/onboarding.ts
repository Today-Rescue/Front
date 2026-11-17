/**
 * 온보딩(0-0 ~ 0-5) 데이터와 API
 *
 * 흐름 (API 명세 기준)
 *   0-1 가게 정보 '다음'  → POST  /stores            { name, lat, lng, dong }   → 새 가게 id 저장
 *   0-2 영업시간 '다음'   → PATCH /stores/{id}       { open_time, close_time, closed_days, alert_hours_before }
 *   0-4 품목 '추가 완료'  → POST  /stores/{id}/items  (수정이면 PATCH /items/{id})
 *
 * 화면 사이에서 입력값을 잃지 않도록 브라우저(localStorage)에 임시 저장한다.
 */
import { api } from "./api";

/* ---------------- 보관 기간 ---------------- */

export type ShelfLife = "today" | "oneDay" | "twoPlus";

/* 화면 값 → 백엔드 값.*/
export const SHELF_LIFE_API: Record<ShelfLife, string> = {
  today: "today",
  oneDay: "day1",
  twoPlus: "day2",
};

export const SHELF_LIFE_OPTIONS: { value: ShelfLife; label: string; tag: string; help: string }[] = [
  { value: "today", label: "당일", tag: "보관 당일", help: "오늘 안에 팔아야 해요. 남으면 모두 ‘위험’이에요." },
  { value: "oneDay", label: "하루", tag: "보관 하루", help: "내일이면 맛이 떨어져요. 많이 남으면 ‘위험’, 조금 남으면 ‘주의’예요." },
  { value: "twoPlus", label: "2일+", tag: "보관 2일+", help: "내일도 팔 수 있어요. 남으면 내일 판매로 넘겨요." },
];

export function shelfLifeFromApi(value: string | undefined): ShelfLife {
  const found = (Object.keys(SHELF_LIFE_API) as ShelfLife[]).find((k) => SHELF_LIFE_API[k] === value);
  return found ?? "oneDay";
}

/* ---------------- 요일 ---------------- */

export const DAYS = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
] as const;

/* ---------------- 임시 저장 데이터 ---------------- */

export type Place = { dong: string; address: string; lat: number; lng: number };

export type DraftItem = {
  localId: string;
  serverId?: number;
  name: string;
  price: number;
  shelfLife: ShelfLife;
  imagePreview?: string; // 미리보기용 (서버 업로드는 TODO)
};

export type OnboardingDraft = {
  storeId?: number;
  name: string;
  place?: Place;
  openTime: string; // "09:00"
  closeTime: string; // "21:00"
  closedDays: string[]; // ["sun"]
  alertHours: 1 | 2 | 3;
  items: DraftItem[];
  done?: boolean;
};

export const EMPTY_DRAFT: OnboardingDraft = {
  name: "",
  openTime: "09:00",
  closeTime: "21:00",
  closedDays: [],
  alertHours: 3,
  items: [],
};

const KEY = "today-rescue:onboarding";

export function loadDraft(): OnboardingDraft {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: OnboardingDraft) {
  try {
    // 이미지 미리보기는 용량이 커서 저장하지 않음
    const slim = { ...draft, items: draft.items.map((it) => ({ ...it, imagePreview: undefined })) };
    localStorage.setItem(KEY, JSON.stringify(slim));
  } catch {
    /* 저장 못 해도 화면은 계속 동작 */
  }
}

/* ---------------- API ---------------- */

/** "09:00" → "09:00:00" (백엔드 시간 형식) */
const toApiTime = (clock: string) => clock.slice(0, 5); // 서버 형식: "hh:mm"

export async function createStore(d: OnboardingDraft) {
  if (!d.place) throw new Error("위치를 선택해 주세요");
  const res = await api.post<{ id: number }>("/stores", {
    name: d.name,
    lat: d.place.lat,
    lng: d.place.lng,
    dong: d.place.dong,
  });
  return res.id;
}

export function updateStoreHours(storeId: number, d: OnboardingDraft) {
  return api.patch(`/stores/${storeId}`, {
    open_time: toApiTime(d.openTime),
    close_time: toApiTime(d.closeTime),
    closed_days: d.closedDays,
    alert_hours_before: d.alertHours,
  });
}

function itemBody(item: DraftItem) {
  return {
    name: item.name,
    price: item.price,
    shelf_life: SHELF_LIFE_API[item.shelfLife],
    is_active: true,
  };
}

export async function createItem(storeId: number, item: DraftItem) {
  const res = await api.post<{ id: number }>(`/stores/${storeId}/items`, itemBody(item));
  return res.id;
}

export function updateItem(itemId: number, item: DraftItem) {
  return api.patch(`/items/${itemId}`, itemBody(item));
}

/* ---------------- 동 검색 ---------------- */
// TODO(C): /geo/search, /geo/region 실제 응답 모양을 확인하고 toPlace 를 맞추기.
//          지금은 흔한 필드 이름(dong/name, address/full_address, lat/lng)을 모두 받아 준다.

type RawPlace = Record<string, unknown>;

function toPlace(raw: RawPlace): Place | null {
  const kakao = raw.address as Record<string, string> | null | undefined;
  const dong = (kakao?.region_3depth_name ?? raw.region_3depth_name ?? raw.dong ?? raw.name) as string | undefined;
  const address = (raw.address_name ?? raw.full_address ?? dong) as string | undefined;  const lat = Number(raw.lat ?? raw.latitude ?? raw.y);
  const lng = Number(raw.lng ?? raw.lon ?? raw.longitude ?? raw.x);
  if (!dong || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { dong, address: address ?? dong, lat, lng };
}

function toPlaces(res: unknown): Place[] {
  const list = Array.isArray(res)
    ? res
    : ((res as { results?: unknown[]; items?: unknown[] })?.results ??
      (res as { items?: unknown[] })?.items ??
      [res]);
  return (list as RawPlace[]).map(toPlace).filter((p): p is Place => p !== null);
}

/** 서버가 안 될 때 데모용으로 보여줄 동 */
const FALLBACK_PLACES: Place[] = [
  { dong: "서교동", address: "서울 마포구 서교동", lat: 37.5552, lng: 126.9188 },
  { dong: "연남동", address: "서울 마포구 연남동", lat: 37.5662, lng: 126.9254 },
  { dong: "합정동", address: "서울 마포구 합정동", lat: 37.5495, lng: 126.9135 },
  { dong: "정릉동", address: "서울 성북구 정릉동", lat: 37.6106, lng: 127.0003 },
];

export async function searchDong(q: string): Promise<Place[]> {
  try {
    const res = await api.get<unknown>("/geo/search", { query: { q } });
    return toPlaces(res);
  } catch (err) {
    console.warn("[geo] 검색 실패, 데모 목록으로 보여줘요", err);
    return FALLBACK_PLACES.filter((p) => p.dong.includes(q) || p.address.includes(q));
  }
}

export async function placeFromLocation(lat: number, lng: number): Promise<Place | null> {
  try {
    const res = await api.get<unknown>("/geo/region", { query: { lat, lng } });
    const place = toPlaces(res)[0];
    return place ? { ...place, lat, lng } : null;
  } catch (err) {
    console.warn("[geo] 현재 위치 변환 실패", err);
    return null;
  }
}
