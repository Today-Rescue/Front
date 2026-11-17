import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { minutesToClock, clockToMinutes } from "@/lib/time";
import type { HomeData } from "@/types/home";
import HomeHeader from "./HomeHeader";

/** 0-5 첫날 메인 (온보딩을 막 끝낸 날) */
export default function FirstDayHome({ data }: { data: HomeData }) {
  const { store } = data;
  const alertClock = minutesToClock(clockToMinutes(store.closeTime) - store.notifyBeforeHours * 60);

  return (
    <main className="pb-8">
      <HomeHeader data={{ ...data, tomorrowHoliday: false }} />

      {/* 2. 첫 마감 알림 배너 */}
      <section className="mx-5 rounded-2xl bg-primary-50 px-5 py-4">
        <p className="flex items-center gap-1.5 text-label-md font-semibold text-primary-600">
          <span className="size-4 rounded bg-primary-300" aria-hidden />첫 마감 알림
        </p>
        <p className="mt-2 text-title-lg font-semibold">
          오늘 <span className="text-primary-600">{alertClock}</span>에 알려드릴게요
        </p>
        <p className="mt-0.5 text-body-md text-gray-700">그때 매대를 찍으면 남은 빵과 할인할 빵을 바로 정리해 드려요.</p>
      </section>

      {/* 3. 최초 진열 촬영 (화면의 유일한 주황 버튼) */}
      <div className="mx-5 mt-4">
        <Link
          href={ROUTES.scan}
          className="flex h-14 w-full items-center justify-center rounded-xl bg-primary-500 text-label-lg font-semibold text-white active:bg-primary-600"
        >
          진열된 매대 찍고 오늘 만든 수량 기록
        </Link>
        <p className="mt-2 text-center text-caption text-gray-600">찍은 수량이 오늘 만든 수량이 되고, 빵 사진도 함께 등록돼요</p>
      </div>

      {/* 4. 지금 팔아야 할 빵 (빈 상태) */}
      <section className="mt-7 px-5">
        <h2 className="text-title-lg font-bold">지금 팔아야 할 빵</h2>
        <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-gray-400 px-5 py-7 text-center">
          <span className="size-10 rounded-lg bg-gray-200" aria-hidden />
          <p className="mt-3 text-title-sm font-semibold text-gray-800">{alertClock} 마감 촬영 후 위험한 빵부터 보여드려요</p>
          <p className="mt-1 text-caption text-gray-600">마감 기록이 3일 쌓이면 내일 생산량도 추천해요</p>
        </div>
      </section>
    </main>
  );
}
