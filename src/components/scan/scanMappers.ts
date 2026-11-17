import type { ScanApiResponse } from "@/lib/scan";
import type { OpenConfirmItem } from "./OpenConfirmScreen";
import type { ScanResultItem } from "./ScanResultScreen";

/** 서버 스캔 결과 → ② 화면 목록. 서버의 safe가 화면의 '여유(ok)' */
export function toResultItems(scan: ScanApiResponse): ScanResultItem[] {
  return scan.items.map((item) => ({
    id: item.item_id,
    name: item.name,
    level: item.level === "safe" ? "ok" : item.level,
    // 못 찾은 품목은 서버의 이유(예: '다 팔렸어요') 대신 못 찾았다고 알려줌
    memo: item.found ? item.reason : "사진에서 못 찾았어요",
    needsCheck: item.needs_check,
    notFound: !item.found,
    quantity: item.quantity,
    imageUrl: item.image_url ?? undefined,
  }));
}

/** 서버 스캔 결과 → 오전-4 화면 목록 (어제 수량은 서버가 안 줘서 비움) */
export function toOpenConfirmItems(scan: ScanApiResponse): OpenConfirmItem[] {
  return scan.items.map((item) => ({ id: item.item_id, name: item.name, quantity: item.quantity }));
}
