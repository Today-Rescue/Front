import { Suspense } from "react";
import OpenConfirmFlow from "@/components/scan/OpenConfirmFlow";

// 오전-4 만든 수량 확인 (A)
// /scan/open/confirm?scan=ID  방금 찍은 사진 결과 확정 / 주소에 scan이 없으면 오늘 수량 직접 수정 (메인의 '수량 고치기')
// (?값을 읽는 부분은 cacheComponents 설정 때문에 <Suspense> 안에 둔다)
export default function Page() {
  return (
    <Suspense fallback={null}>
      <OpenConfirmFlow />
    </Suspense>
  );
}
