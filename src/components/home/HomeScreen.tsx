"use client";

import { useHomeData } from "@/hooks/useHomeData";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { useSlowFlag } from "@/hooks/useSlowFlag";
import { MOCK_HOME_EMPTY } from "@/lib/home";
import { createBundle } from "@/components/sale/api";
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
  const { data, setData, failed } = useHomeData({ empty: options.empty, useMockOnly: options.mockOnly });
  const now = useNow();
  const { draft } = useOnboardingDraft();
  const slow = useSlowFlag(!data);

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
        : (data ?? MOCK_HOME_EMPTY).store;
    return <FirstDayHome data={{ ...(data ?? MOCK_HOME_EMPTY), store }} />;
  }

  // 서버에서 불러오는 중
  if (!data) {
    return (
      <main className="px-6 pt-6" aria-busy>
        <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-100" />
        <div className="mt-5 h-36 animate-pulse rounded-2xl bg-gray-100" />
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-gray-100" />
        <div className="mt-7 h-64 animate-pulse rounded-2xl bg-gray-100" />
        {slow && (
          <p className="mt-4 text-center text-caption text-gray-600">서버를 깨우는 중이에요. 처음엔 최대 1분 걸릴 수 있어요.</p>
        )}
      </main>
    );
  }

  // 처음 그릴 때는 시각을 모르니 잠깐 비워 둔다 (서버/브라우저 시각 차이로 생기는 오류 방지)
  if (!now && !options.now) return <div className="min-h-dvh" />;

  const nowMinutes = options.now ? clockToMinutes(options.now) : dateToMinutes(now!);
  const notifyMinutes = clockToMinutes(data.store.closeTime) - data.store.notifyBeforeHours * 60;
  const mode: HomeMode = options.mode ?? (nowMinutes < notifyMinutes ? "morning" : "closing");

  return (
    <main className="pb-8">
      <HomeHeader data={data} />
      {failed && (
        <p className="mx-6 mb-3 rounded-lg bg-gray-100 px-3 py-2 text-caption text-gray-600">
          서버에 연결하지 못해 예시 데이터를 보여주고 있어요.
        </p>
      )}
      <ModeBanner mode={mode} store={data.store} nowMinutes={nowMinutes} />
      {mode === "morning" ? (
        <MorningSection data={data} />
      ) : (
        <ClosingSection
          data={data}
          onAcceptBundle={async () => {
            const b = data.bundle;
            if (b?.parts) {
              // 추천 세트를 그대로 마켓에 올림 (POST /stores/{id}/campaigns/bundle)
              await createBundle({
                name: b.name,
                price: b.price,
                items: b.parts.map((p) => ({ item_id: p.itemId, per_pack: p.perPack })),
              });
            }
            setData((prev) => (prev ? { ...prev, bundleOnSale: true } : prev));
          }}
        />
      )}
    </main>
  );
}
