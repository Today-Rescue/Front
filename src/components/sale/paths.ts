import { ROUTES } from "@/lib/routes";

/**
 * 판매·마감 화면 주소 중 아직 lib/routes.ts 에 없는 것.
 * 팀에서 경로가 정해지면 routes.ts 로 옮긴다.
 */
export const SALE_PATHS = {
  status: ROUTES.saleStatus, // ④ 마감 세일 현황
  remainingCheck: "/sale/status/check", // ④-1 마감 남은 빵 확인
  closing: "/closing", // ⑤ 오늘 마감 기록 (?date=YYYY-MM-DD 로 다른 날 수정, ?left=8:5,9:2 로 남은 수량 넘겨받음)
} as const;
