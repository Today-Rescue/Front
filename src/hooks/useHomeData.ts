"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { fetchLiveStatus, recommendBundles } from "@/components/sale/api";
import { getScan } from "@/lib/scan";
import {
  MOCK_HOME,
  MOCK_HOME_EMPTY,
  buildClosing,
  buildHomeData,
  fetchHome,
  fetchProductions,
  fetchStore,
  fetchStoreItems,
} from "@/lib/home";
import type { HomeData } from "@/types/home";

/**
 * 메인 화면 데이터.
 * - 실제 서버: 가게 정보 + 품목 + 오늘 만든 수량 + 날씨(/home)를 한꺼번에 불러와서 합친다
 * - 가게 정보를 못 불러오면 예시(mock) 데이터로 보여주고 failed = true
 * - useMockOnly=true(?mock=1) 면 서버를 부르지 않는다
 */
export function useHomeData({ empty = false, useMockOnly = false } = {}) {
  const mock = empty ? MOCK_HOME_EMPTY : MOCK_HOME;
  const offline = useMockOnly || !API_BASE_URL;
  const [data, setData] = useState<HomeData | null>(offline ? mock : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (offline) return;
    let cancelled = false;

    Promise.allSettled([fetchStore(), fetchStoreItems(), fetchProductions(), fetchHome(), fetchLiveStatus()]).then(
      async ([store, items, productions, home, live]) => {
        if (cancelled) return;
        if (store.status === "rejected") {
          console.warn("[home] 가게 정보 불러오기 실패, 예시 데이터로 보여줘요", store.reason);
          setData(mock);
          setFailed(true);
          return;
        }
        const itemList = items.status === "fulfilled" ? items.value : [];
        const base = buildHomeData({
          store: store.value,
          items: itemList,
          productions: productions.status === "fulfilled" ? productions.value : null,
          home: home.status === "fulfilled" ? home.value : null,
        });
        setData(base);

        // ① 마감 모드 정보 (오늘 재고 스캔이 있을 때만 위험도·세트 추천을 더 불러옴)
        const liveStatus = live.status === "fulfilled" ? live.value : null;
        const scanId = liveStatus?.last_scan?.scan_id;
        const [scan, recs] = await Promise.all([
          scanId ? getScan(scanId).catch(() => null) : null,
          scanId && !liveStatus?.bundle ? recommendBundles().catch(() => []) : [],
        ]);
        if (cancelled) return;
        setData({
          ...base,
          ...buildClosing({
            live: liveStatus,
            scan,
            recommendation: recs[0] ?? null,
            items: itemList,
            madeTotal: productions.status === "fulfilled" ? productions.value.made_total : 0,
          }),
        });
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline]);

  return { data, setData, failed };
}
