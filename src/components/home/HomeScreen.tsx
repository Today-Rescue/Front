"use client";

import { useHomeData } from "@/hooks/useHomeData";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { useNow } from "@/hooks/useNow";
import { clockToMinutes, dateToMinutes } from "@/lib/time";
import ClosingSection from "./ClosingSection";
import FirstDayHome from "./FirstDayHome";
import HomeHeader from "./HomeHeader";
import MorningSection from "./MorningSection";
import ModeBanner, { type HomeMode } from "./ModeBanner";

export type HomeScreenOptions = {
  /** 테스트용: 모드 강제 (?mode=morning | ?mode=closing) */
  mode?: HomeMode;
  /** 테스트용: 지금 시각 강제 (?now=14:05) */
  now?: string;
  /** 테스트용: 빈 상태 보기 (?data=empty) */
  empty?: boolean;
  /** 테스트용: 서버 안 부르고 mock만 (?mock=1) */
  mockOnly?: boolean;
  /** 온보딩을 막 끝낸 첫날 화면 0-5 (?first=1) */
  first?: boolean;
};

/**
 * '오늘' 탭 메인 화면.
 * 마감 알림 시각(마감 - N시간) 전이면 오전-1, 이후면 ① 마감 메인을 보여준다.
 */
export default function HomeScreen(options: HomeScreenOptions) {
  const { data, setData } = useHomeData({ empty: options.empty, useMockOnly: options.mockOnly });
  const now = useNow();
  const { draft } = useOnboardingDraft();

  // 0-5 첫날 메인: 온보딩에서 입력한 가게 정보로 보여줌
  if (options.first) {
    const store =
      draft.name && draft.place
        ? {
            name: draft.name,
            dong: draft.place.dong,
            openTime: draft.openTime,
            closeTime: draft.closeTime,
            notifyBeforeHours: draft.alertHours,
          }
        : data.store;
    return <FirstDayHome data={{ ...data, store }} />;
  }

  // 처음 그릴 때는 시각을 모르니 잠깐 비워 둔다 (서버/브라우저 시각 차이로 생기는 오류 방지)
  if (!now && !options.now) return <div className="min-h-dvh" />;

  const nowMinutes = options.now ? clockToMinutes(options.now) : dateToMinutes(now!);
  const notifyMinutes = clockToMinutes(data.store.closeTime) - data.store.notifyBeforeHours * 60;
  const mode: HomeMode = options.mode ?? (nowMinutes < notifyMinutes ? "morning" : "closing");

  return (
    <main className="pb-8">
      <HomeHeader data={data} />
      <ModeBanner mode={mode} store={data.store} nowMinutes={nowMinutes} />
      {mode === "morning" ? (
        <MorningSection data={data} />
      ) : (
        <ClosingSection
          data={data}
          onAcceptBundle={() => {
            // TODO(C): POST /stores/{id}/campaigns/bundle 로 게시 (B와 요청 형식 맞추기)
            setData((prev) => ({ ...prev, bundleOnSale: true }));
          }}
        />
      )}
    </main>
  );
}
