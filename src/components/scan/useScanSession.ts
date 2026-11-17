"use client";

import { useEffect, useState } from "react";
import { getScan, loadScanSession, type ScanSession } from "@/lib/scan";

type State = { status: "loading" } | { status: "ready"; session: ScanSession } | { status: "missing" };

/**
 * 주소의 scan 값(스캔 ID)에 맞는 스캔 결과를 가져온다.
 * 방금 저장해 둔 결과가 있으면 그걸 쓰고, 없으면(다른 탭 등) 서버에서 다시 불러온다.
 */
export function useScanSession(scanParam: string | null): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const id = Number(scanParam);

    if (!scanParam || Number.isNaN(id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소 값이 없으면 바로 '없음'으로
      setState({ status: "missing" });
      return;
    }
    const saved = loadScanSession();
    if (saved && saved.scan.scan_id === id) {
      setState({ status: "ready", session: saved });
      return;
    }
    if (id === 0) {
      // 직접 입력용(서버에 스캔 없음)인데 저장된 값이 없으면 복구할 수 없음
      setState({ status: "missing" });
      return;
    }
    getScan(id)
      .then((scan) => !cancelled && setState({ status: "ready", session: { scan, photoCount: 1 } }))
      .catch(() => !cancelled && setState({ status: "missing" }));

    return () => {
      cancelled = true;
    };
  }, [scanParam]);

  return state;
}
