"use client";

import { useEffect, useState } from "react";

/**
 * 지금 시각. 1분마다 다시 그려진다.
 * 서버와 브라우저 시각이 달라 생기는 오류를 막으려고, 처음 한 번은 null 을 돌려준다.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    // 분이 바뀌는 순간에 맞춰 갱신
    const toNextMinute = intervalMs - (Date.now() % intervalMs);
    let timer: ReturnType<typeof setInterval>;
    const first = setTimeout(() => {
      tick();
      timer = setInterval(tick, intervalMs);
    }, toNextMinute);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
