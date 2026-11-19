import { clockToMinutes, formatDuration, minutesToClock } from "@/lib/time";
import type { HomeStore } from "@/types/home";

export type HomeMode = "morning" | "closing";

/**
 * 오전 판매 모드 / 오후 마감 모드 배너
 * - 남은 시간만 주황, 1분마다 줄어듦 (nowMinutes 를 부모가 1분마다 넘겨줌)
 * - 진행 막대: 오픈 → 지금 → 마감
 */
export default function ModeBanner({
  mode,
  store,
  nowMinutes,
}: {
  mode: HomeMode;
  store: HomeStore;
  nowMinutes: number;
}) {
  const open = clockToMinutes(store.openTime);
  const close = clockToMinutes(store.closeTime);
  const notify = close - store.notifyBeforeHours * 60;

  const target = mode === "morning" ? notify : close;
  const left = target - nowMinutes;
  const progress = Math.min(1, Math.max(0, (nowMinutes - open) / (close - open)));

  return (
    <section className="mx-6 rounded-2xl bg-primary-50 px-5 pt-4 pb-4">
      <div className="flex items-center justify-between">
        <span className="text-label-md font-semibold text-primary-600">
          {mode === "morning" ? "오전 판매 모드" : "오후 마감 모드"}
        </span>
        {mode === "closing" && <span className="text-caption text-gray-700">{store.closeTime} 마감</span>}
      </div>

      <p className="mt-2 text-title-lg font-semibold">
        {left <= 0 ? (
          mode === "morning" ? (
            "곧 마감 모드로 바뀌어요"
          ) : (
            "오늘 영업이 끝났어요"
          )
        ) : mode === "morning" ? (
          <>
            마감 알림까지 <span className="text-primary-600">{formatDuration(left)}</span>
          </>
        ) : (
          <>
            마감까지 <span className="text-primary-600">{formatDuration(left)}</span> 남았어요
          </>
        )}
      </p>
      {mode === "closing" && <p className="mt-0.5 text-body-md text-gray-700">남은 재고를 확인해 볼까요?</p>}

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-200" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-caption text-gray-600">
        <span>{store.openTime} 오픈</span>
        <span>지금 {minutesToClock(nowMinutes)}</span>
        <span>{store.closeTime}</span>
      </div>
    </section>
  );
}
