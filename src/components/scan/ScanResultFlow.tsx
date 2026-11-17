"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { confirmScan, formatScanTime, recalcRisk, type ScanSession } from "@/lib/scan";
import ScanNotice from "./ScanNotice";
import ScanResultScreen, { type ScanResultItem, type SellMethod } from "./ScanResultScreen";
import { toResultItems } from "./scanMappers";
import { useScanSession } from "./useScanSession";

const RECALC_DELAY_MS = 500;

/** ② 스캔 결과 확인 (재고 기록). 주소: /scan/result?scan=ID */
export default function ScanResultFlow() {
  const scanParam = useSearchParams().get("scan");
  const state = useScanSession(scanParam);
  if (state.status === "loading") return <ScanNotice kind="loading" />;
  if (state.status === "missing") return <ScanNotice kind="missing" />;
  return <ResultBody session={state.session} />;
}

function ResultBody({ session }: { session: ScanSession }) {
  const router = useRouter();
  const { scan } = session;
  const [items, setItems] = useState<ScanResultItem[]>(() => toResultItems(scan));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  // 이동했다가 돌아오면(이전 화면이 보존돼 있음) '확정 중' 상태가 남지 않게 풀어 줌
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 들어올 때마다 확정 상태 초기화 */
    setConfirming(false);
    setError("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });
  const timerRef = useRef<number | undefined>(undefined);
  const requestRef = useRef(0);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  /** 수량을 고치면 잠깐 기다렸다가 서버에서 총 재고·위험도를 다시 계산해서 뱃지·메모를 새로 맞춤 */
  const scheduleRecalc = () => {
    if (!scan.scan_id) return; // 직접 입력(서버에 스캔 없음)은 다시 계산할 수 없음
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      const request = ++requestRef.current;
      try {
        const res = await recalcRisk(
          scan.scan_id,
          itemsRef.current.map((row) => ({ item_id: row.id, quantity: row.quantity })),
        );
        if (request !== requestRef.current) return; // 더 최근에 고친 값이 있으면 이 응답은 버림
        setItems((prev) =>
          prev.map((row) => {
            const next = res.items.find((item) => item.item_id === row.id);
            if (!next) return row;
            return { ...row, level: next.level === "safe" ? "ok" : next.level, memo: row.notFound ? row.memo : next.reason };
          }),
        );
      } catch {
        // 다시 계산하지 못해도 입력한 수량은 그대로 둠
      }
    }, RECALC_DELAY_MS);
  };

  const changeQuantity = (id: number, quantity: number) => {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, quantity } : row)));
    scheduleRecalc();
  };

  const confirm = async (method: SellMethod) => {
    setConfirming(true);
    setError("");
    try {
      // TODO: 직접 입력(scan_id 0)은 서버에 확정할 스캔이 없어서 저장하지 못함. 백엔드와 방법 확인 필요
      if (scan.scan_id) {
        await confirmScan(
          scan.scan_id,
          "close",
          items.map((row) => ({ item_id: row.id, quantity: row.quantity })),
        );
      }
      router.push(method === "discount" ? ROUTES.saleDiscount : ROUTES.saleBundle);
    } catch {
      setError("확정하지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
      setConfirming(false);
    }
  };

  return (
    <ScanResultScreen
      photoLabel={`매대 사진 · ${formatScanTime(scan.scanned_at)}`}
      photoUrl={scan.image_url || undefined}
      items={items}
      onChangeQuantity={changeQuantity}
      onBack={() => router.push(ROUTES.home)}
      onRetake={() => router.push(ROUTES.scan)}
      onConfirm={confirm}
      confirming={confirming}
      error={error}
    />
  );
}
