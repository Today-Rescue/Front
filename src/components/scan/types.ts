/** 촬영 목적. 스캔 API의 purpose 값과 같다 (open = 최초 진열, close = 재고 기록) */
export type ScanPurpose = "open" | "close";

/** 추가 생산 시트에 보여줄 품목. 서버 응답 모양이 확정되면 API 연동 때 맞춰서 바꾼다 */
export type ProductionItem = {
  id: number;
  name: string;
  /** 지금까지 오늘 만든 수량 */
  madeToday: number;
};

/** 촬영(또는 갤러리에서 고른) 매대 사진 한 장. url은 화면 미리보기용 */
export type ShotPhoto = {
  id: string;
  blob: Blob;
  url: string;
};
