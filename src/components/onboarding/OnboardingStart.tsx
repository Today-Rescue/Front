import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { APP_MAX_WIDTH } from "@/components/common/layout";

/** 0-0 시작 화면 */
export default function OnboardingStart() {
  return (
    <main className="flex min-h-dvh flex-col">
      {/* 1. 사진 영역 (빵 사진 들어갈 자리) */}
      <div className="h-[476px] w-full shrink-0 bg-gray-200" aria-hidden />

      {/* 2. 소개 문구 */}
      <section className="px-5 pt-8">
        <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-label-md font-semibold text-primary-600">
          소상공인을 위한 하루 구조
        </span>
        <h1 className="mt-4 text-display-sm font-bold">
          내일은 알맞게 만들고,
          <br />
          오늘 남은 빵은 구해요.
        </h1>
        <p className="mt-3 text-body-md text-gray-700">
          남은 빵은 사진 한 장으로 확인해 바로 팔고,
          <br />
          내일 생산량은 날씨와 공휴일에 맞춰 추천해요.
        </p>
      </section>

      {/* 3. 시작하기 */}
      <div className="h-28" />
      <div
        className="fixed bottom-0 left-1/2 w-full -translate-x-1/2 bg-white px-5 pt-3"
        style={{ maxWidth: APP_MAX_WIDTH, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <Link
          href={ROUTES.onboardingStore}
          className="flex h-14 w-full items-center justify-center rounded-full bg-primary-500 text-label-lg font-semibold text-white active:bg-primary-600"
        >
          시작하기
        </Link>
      </div>
    </main>
  );
}
