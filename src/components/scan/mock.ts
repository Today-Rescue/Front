import type { OpenConfirmItem } from "./OpenConfirmScreen";
import type { ScanResultItem } from "./ScanResultScreen";

// 디자인 시안 숫자를 그대로 쓴 임시 데이터. 스캔 API를 붙이면(이슈 #13) 서버 값으로 바뀐다.

/** 오전-4 만든 수량 확인 */
export const MOCK_OPEN_CONFIRM: { photoLabel: string; items: OpenConfirmItem[] } = {
  photoLabel: "진열 사진 3장 · 오전 9:10",
  items: [
    { id: 8, name: "소금빵", yesterday: 32, quantity: 30 },
    { id: 9, name: "크루아상", yesterday: 30, quantity: 30 },
    { id: 10, name: "단팥빵", yesterday: 28, quantity: 28 },
    { id: 11, name: "햄치즈 샌드위치", yesterday: 8, quantity: 10 },
    { id: 12, name: "식빵", yesterday: 36, quantity: 36 },
    { id: 13, name: "모카번", yesterday: 30, quantity: 30 },
    { id: 14, name: "크림빵", yesterday: 24, quantity: 24 },
  ],
};

/** ② 스캔 결과 확인 */
export const MOCK_SCAN_RESULT: { photoLabel: string; items: ScanResultItem[] } = {
  photoLabel: "매대 사진 · 오후 6:02",
  items: [
    { id: 8, name: "소금빵", level: "danger", memo: "오늘 소비기한", quantity: 15 },
    { id: 9, name: "크루아상", level: "danger", memo: "내일 품질 저하", quantity: 12 },
    { id: 10, name: "단팥빵", level: "caution", memo: "판매 느림", quantity: 8 },
    { id: 11, name: "햄치즈 샌드위치", level: "caution", memo: "일부 가려짐", needsCheck: true, quantity: 5 },
    { id: 12, name: "식빵", level: "ok", memo: "소비기한 2일", quantity: 30 },
    { id: 13, name: "모카번", level: "ok", memo: "소비기한 1일", quantity: 25 },
    { id: 14, name: "크림빵", level: "ok", memo: "냉장 보관 중", quantity: 20 },
  ],
};
