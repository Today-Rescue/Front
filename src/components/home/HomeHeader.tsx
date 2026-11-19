import type { HomeData } from "@/types/home";

/** 메인 상단: 가게명, 날짜·동, 날씨 칩, '내일 공휴일' (스크롤하면 같이 올라감) */
export default function HomeHeader({ data }: { data: HomeData }) {
  const { store, weather, dateLabel, tomorrowHoliday } = data;

  return (
    <header className="flex items-start justify-between px-6 pt-6 pb-4">
      <div className="min-w-0">
        <h1 className="truncate text-heading-lg font-bold">{store.name}</h1>
        <p className="mt-0.5 text-body-md text-gray-700">
          {dateLabel} · {store.dong}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {weather && (
          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-caption font-medium text-gray-800">
            {weather.temp}°C · 강수 {weather.rainChance}%
          </span>
        )}
        {tomorrowHoliday && <span className="text-label-md font-semibold text-primary-600">내일 공휴일</span>}
      </div>
    </header>
  );
}

