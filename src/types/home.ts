/**
 * 메인 화면(오전-1 / ①)에서 쓰는 데이터 모양.
 * 백엔드 응답을 그대로 쓰지 않고, 여러 API 결과를 이 모양으로 모아서 화면에 넘긴다.
 * (API 응답 모양이 바뀌어도 src/lib/home.ts 의 변환 부분만 고치면 됨)
 */

/** "HH:mm" 형식 시각. 예: "09:00", "21:00" */
export type Clock = string;

export type HomeStore = {
  name: string; // 한빛베이커리
  dong: string; // 서교동
  openTime: Clock; // 09:00
  closeTime: Clock; // 21:00
  notifyBeforeHours: 1 | 2 | 3; // 마감 몇 시간 전에 알림 (기본 3)
};

export type HomeWeather = {
  temp: number; // 화면에 보여줄 기온(℃)
  rainChance: number; // 강수확률(%)
};

export type ProductionRow = {
  itemId: number;
  name: string;
  made: number; // 오늘 만든 수량(최초 진열 + 추가 생산)
  /** 추가 생산 기록. 예: [{ qty: 10, time: "14:00" }] → '+10 · 14:00' 태그 */
  extras: { qty: number; time: Clock }[];
};

export type FirstDisplay = {
  time: Clock; // 09:10
  shelves?: number; // 매대 수 (서버에서 모르면 없음)
  count: number; // 찍힌 개수
};

export type ScanSummary = {
  time: Clock; // 마지막 스캔 시각
  shelves: number;
  madeTotal: number; // 오늘 만든 총량
  remaining: number; // 남은 재고
  riskKinds: number; // 위험 품목 수
  cautionKinds: number; // 주의 품목 수
  recommendedDiscount: number; // 추천 할인율(%)
};

export type BundleSuggestion = {
  name: string; // 퇴근길 든든 팩
  price: number; // 9900
  packs: number; // 4
  /** 구성 설명에 굵게 보여줄 품목 */
  items: { name: string; qty: number }[];
};

export type HomeData = {
  dateLabel: string; // 11월 08일
  store: HomeStore;
  weather: HomeWeather | null;
  tomorrowHoliday: boolean;
  firstDisplay: FirstDisplay | null; // null = 아직 최초 진열 기록 전
  production: ProductionRow[];
  lastScan: ScanSummary | null; // null = 아직 마감 스캔 전
  saleLive: boolean; // 마감 세일 게시 중인지
  bundle: BundleSuggestion | null;
  bundleOnSale: boolean;
};
