"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { MOCK_HOME, MOCK_HOME_EMPTY, fetchHome, mergeHomeApi } from "@/lib/home";
import type { HomeData } from "@/types/home";

/**
 * 메인 화면 데이터.
 * - 먼저 mock 데이터로 바로 그린다 (Render 서버가 깨어나는 데 30~60초 걸려서)
 * - 서버 응답이 오면 받은 부분만 실제 값으로 바꾼다
 * - useMockOnly=true 면 서버를 부르지 않는다
 */
export function useHomeData({ empty = false, useMockOnly = false } = {}) {
  const [data, setData] = useState<HomeData>(empty ? MOCK_HOME_EMPTY : MOCK_HOME);
  const [source, setSource] = useState<"mock" | "api">("mock");

  useEffect(() => {
    if (useMockOnly || !API_BASE_URL) return;
    let cancelled = false;

    fetchHome()
      .then((res) => {
        if (cancelled) return;
        setData((prev) => mergeHomeApi(prev, res));
        setSource("api");
      })
      .catch((err) => console.warn("[home] /home 불러오기 실패, mock 데이터로 보여줘요", err));

    return () => {
      cancelled = true;
    };
  }, [useMockOnly]);

  return { data, setData, source };
}
