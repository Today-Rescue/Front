"use client";

import { useRouter } from "next/navigation";
import OpenConfirmScreen from "@/components/scan/OpenConfirmScreen";
import { MOCK_OPEN_CONFIRM } from "@/components/scan/mock";
import { ROUTES } from "@/lib/routes";

// 오전-4 최초 진열 확인 (A). 메인의 '수량 고치기'에서도 이 주소로 들어옴
export default function Page() {
  const router = useRouter();

  return (
    <OpenConfirmScreen
      {...MOCK_OPEN_CONFIRM}
      onBack={() => router.back()}
      onRetake={() => router.push(ROUTES.scan)}
      // TODO(A, 이슈 #13): POST /scans/{id}/confirm 으로 저장한 뒤 이동
      onSave={() => router.push(ROUTES.home)}
    />
  );
}
