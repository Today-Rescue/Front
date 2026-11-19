import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import breadPhoto from "../../../public/images/onboarding-bread.jpg";

/**
 * 0-0 시작 화면
 * 화면 높이에 딱 맞게 그려서 스크롤이 생기지 않게 한다.
 * 사진이 남는 공간을 차지하고(최대 476px), 화면이 작으면 사진만 줄어든다.
 */
export default function OnboardingStart() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {/* 1. 사진 영역 */}
      <div className="relative h-[476px] min-h-40 w-full shrink">
        <Image
          src={breadPhoto}
          alt="식힘망 위에 놓인 갓 구운 빵"
          fill
          priority
          sizes="390px"
          placeholder="blur"
          className="object-cover object-top"
        />
        {/* 피그마처럼 사진이 아래로 갈수록 흰색으로 흐려지게 */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.75) 80%, #fff 100%)",
          }}
        />
      </div>

      {/* 2. 소개 문구 */}
      <section className="shrink-0 px-6 pt-7">
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

      {/* 남는 공간 (화면이 크면 문구와 버튼 사이가 벌어짐) */}
      <div className="min-h-6 flex-1" />

      {/* 3. 시작하기 */}
      <div className="shrink-0 px-6 pt-3" style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
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
