import { Suspense } from "react";
import ScanResultFlow from "@/components/scan/ScanResultFlow";

// ② 스캔 결과 확인 (A). /scan/result?scan=ID
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ScanResultFlow />
    </Suspense>
  );
}
