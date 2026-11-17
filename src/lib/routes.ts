/**
 * 화면 사이 이동 주소 모음.
 * 다른 사람이 만드는 화면 주소가 바뀌면 여기만 고치면 된다.
 */
export const ROUTES = {
  home: "/",

  // C - 온보딩
  onboardingStart: "/onboarding",
  onboardingStore: "/onboarding/store",
  onboardingHours: "/onboarding/hours",
  onboardingItems: "/onboarding/items",
  onboardingItemNew: "/onboarding/items/new",

  // A - 촬영·스캔 (주소는 A와 확인 필요)
  scan: "/scan", // 촬영 목적 선택 (오전-2 / ①-1)
  productionConfirm: "/scan/open/confirm", // 오전-4 만든 수량 확인 (수량 고치기)
  productionAdd: "/scan/add", // 오전-5 추가 생산 기록 (바텀시트)

  // B - 판매·마감·기록
  saleDiscount: "/sale/discount", // ③-a 일괄 할인
  saleBundle: "/sale/bundle", // ③-b 세트 구성
  saleStatus: "/sale/status", // ④ 마감 세일 현황
  records: "/records",
  recommend: "/recommend",

  // C - 대시보드
  dashboard: "/dashboard",
} as const;
