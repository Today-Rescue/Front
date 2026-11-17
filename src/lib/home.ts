import type { HomeData } from "@/types/home";
import { api, storePath } from "./api";

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

// TODO(C): 아래 API도 응답을 받아 보고 연결
//  - GET /stores/{id}            → store (가게명, 동, 영업시간, 마감 알림)
//  - GET /stores/{id}/items      → 품목 이름
//  - GET /stores/{id}/productions → production, firstDisplay
//  - 마지막 스캔 / 세일 / 세트 추천 → lastScan, saleLive, bundle
