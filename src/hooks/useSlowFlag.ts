"use client";

import { useEffect, useState } from "react";

/**
 * loading 이 ms 이상 이어지면 true.
 * Render 무료 서버가 잠에서 깨는 동안 '최대 1분 걸려요' 안내를 띄울 때 쓴다.
 */
export function useSlowFlag(loading: boolean, ms = 3000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), ms);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [loading, ms]);
  return loading && slow;
}
