import type { HomeData } from "@/types/home";

/** 메인 상단: 가게명, 날짜·동, 날씨 칩, '내일 공휴일' (스크롤하면 같이 올라감) */
export default function HomeHeader({ data }: { data: HomeData }) {
  const { store, weather, dateLabel, tomorrowHoliday } = data;

  return (
    <header className="flex items-start justify-between px-5 pt-6 pb-4">
      <div className="min-w-0">
        <h1 className="truncate text-heading-lg font-bold">{store.name}</h1>
        <p className="mt-0.5 text-body-md text-gray-700">
          {dateLabel} · {store.dong}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {weather && (
          <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-caption font-medium text-gray-800">
            <WeatherIcon rainy={weather.rainChance >= 50} />
            {weather.temp}°C · 강수 {weather.rainChance}%
          </span>
        )}
        {tomorrowHoliday && <span className="text-label-md font-semibold text-primary-600">내일 공휴일</span>}
      </div>
    </header>
  );
}

function WeatherIcon({ rainy }: { rainy: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-600)" strokeWidth="2" strokeLinecap="round" aria-hidden>
      {rainy ? (
        <>
          <path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 18 9a3.5 3.5 0 0 1-.5 6.9H7z" />
          <path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
        </>
      )}
    </svg>
  );
}
