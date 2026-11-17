"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { confirmScan, createProduction, fetchItems, fetchMadeToday, formatScanTime, type ScanSession } from "@/lib/scan";
import OpenConfirmScreen, { type OpenConfirmItem } from "./OpenConfirmScreen";
import ScanNotice from "./ScanNotice";
import { toOpenConfirmItems } from "./scanMappers";
import { useScanSession } from "./useScanSession";

/**
 * 오전-4 만든 수량 확인
 * - 주소에 ?scan=ID 가 있으면: 방금 찍은 사진의 결과를 확정 (최초 진열)
 * - 없으면(메인의 '수량 고치기'): 오늘 만든 수량을 불러와서 직접 고침
 */
export default function OpenConfirmFlow() {
  const scanParam = useSearchParams().get("scan");
  return scanParam ? <FromScan scanParam={scanParam} /> : <EditToday />;
}

function FromScan({ scanParam }: { scanParam: string }) {
  const state = useScanSession(scanParam);
  if (state.status === "loading") return <ScanNotice kind="loading" />;
  if (state.status === "missing") return <ScanNotice kind="missing" />;
  return <ConfirmBody session={state.session} />;
}

function ConfirmBody({ session }: { session: ScanSession }) {
  const router = useRouter();
  const { scan, photoCount } = session;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 이동했다가 돌아오면(이전 화면이 보존돼 있음) '저장 중' 상태가 남지 않게 풀어 줌
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 들어올 때마다 저장 상태 초기화 */
    setSaving(false);
    setError("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const save = async (rows: OpenConfirmItem[]) => {
    setSaving(true);
    setError("");
    try {
      const items = rows.map((row) => ({ item_id: row.id, quantity: row.quantity }));
      if (scan.scan_id) await confirmScan(scan.scan_id, "open", items);
      else await createProduction("initial", items.map((item) => ({ item_id: item.item_id, qty: item.quantity })));
      router.push(ROUTES.home);
    } catch {
      setError("저장하지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
      setSaving(false);
    }
  };

  return (
    <OpenConfirmScreen
      photoLabel={photoCount > 0 ? `진열 사진 ${photoCount}장 · ${formatScanTime(scan.scanned_at)}` : "사진 없이 직접 입력"}
      photoUrl={scan.image_url || undefined}
      items={toOpenConfirmItems(scan)}
      onBack={() => router.back()}
      onRetake={() => router.push(ROUTES.scan)}
      onSave={save}
      saving={saving}
      error={error}
    />
  );
}

/** 사진 없이, 오늘 만든 수량을 불러와서 고치는 경우 */
function EditToday() {
  const router = useRouter();
  const [items, setItems] = useState<OpenConfirmItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchItems(), fetchMadeToday()])
      .then(([list, made]) => {
        if (!cancelled) setItems(list.map((item) => ({ id: item.id, name: item.name, quantity: made.get(item.id) ?? 0 })));
      })
      .catch(() => !cancelled && setError("오늘 만든 수량을 불러오지 못했어요."));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items) return error ? <ScanNotice kind="missing" message={error} /> : <ScanNotice kind="loading" />;

  const save = async (rows: OpenConfirmItem[]) => {
    setSaving(true);
    setError("");
    try {
      await createProduction("edit", rows.map((row) => ({ item_id: row.id, qty: row.quantity })));
      router.push(ROUTES.home);
    } catch {
      setError("저장하지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
      setSaving(false);
    }
  };

  return (
    <OpenConfirmScreen
      photoLabel="오늘 만든 수량 직접 수정"
      items={items}
      onBack={() => router.back()}
      onRetake={() => router.push(ROUTES.scan)}
      onSave={save}
      saving={saving}
      error={error}
    />
  );
}
