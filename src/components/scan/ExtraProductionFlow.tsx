"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { createProduction, fetchItems, fetchMadeToday } from "@/lib/scan";
import ExtraProductionSheet from "./ExtraProductionSheet";
import ScanNotice from "./ScanNotice";
import type { ProductionItem } from "./types";

/**
 * 오전-5 추가 생산 기록. 주소: /scan/add
 * 시트가 메인 위에 뜨는 화면이라, 가능하면 메인에서 ExtraProductionSheet를 바로 열어도 됨
 */
export default function ExtraProductionFlow() {
  const router = useRouter();
  const [items, setItems] = useState<ProductionItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchItems(), fetchMadeToday()])
      .then(([list, made]) => {
        if (!cancelled) setItems(list.map((item) => ({ id: item.id, name: item.name, madeToday: made.get(item.id) ?? 0 })));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <ScanNotice kind="missing" message="품목을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요." />;
  if (!items) return <ScanNotice kind="loading" />;

  return (
    <ExtraProductionSheet
      open
      items={items}
      onSubmit={async ({ itemId, quantity }) => {
        await createProduction("extra", [{ item_id: itemId, qty: quantity }]);
        router.push(ROUTES.home);
      }}
      onClose={() => router.back()}
    />
  );
}
