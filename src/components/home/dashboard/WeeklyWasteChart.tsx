import type { DashboardResponse } from "@/types/dashboard";

const WEEKDAY_KO: Record<string, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
};

const BAR_AREA = 150; // 막대가 그려지는 높이(px)

/**
 * 요일별 폐기 수량 (지난주 회색 / 이번 주 주황), 막대 위 숫자는 이번 주
 * - 쉬는 날(closedDays)은 뺀다 → 월~금 가게는 5개, 월~토 가게는 6개
 * - 아직 오지 않은 날(today 이후)은 이번 주 막대 없이 숫자 자리에 '–'
 */
export default function WeeklyWasteChart({
  days,
  closedDays,
  today,
  comment,
}: {
  days: DashboardResponse["daily_waste"];
  closedDays: string[];
  today: string; // "2026-11-17"
  comment: string;
}) {
  const shown = days.filter((d) => !closedDays.includes(d.weekday));
  const max = Math.max(1, ...shown.flatMap((d) => [d.this_week, d.last_week]));
  const h = (n: number) => Math.max(n > 0 ? 4 : 0, Math.round((n / max) * BAR_AREA));

  return (
    <section className="mx-5 mt-4 rounded-2xl bg-gray-100 px-5 pt-5 pb-5">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-bold">요일별 폐기 수량</h2>
        <div className="flex items-center gap-3 text-caption text-gray-700">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-gray-400" aria-hidden />
            지난주
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-primary-500" aria-hidden />
            이번 주
          </span>
        </div>
      </div>

      <div className="mt-5 flex justify-between gap-1" role="img" aria-label="요일별 폐기 수량 막대 차트">
        {shown.map((d) => {
          const future = d.date > today;
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center">
              <span className={`text-title-sm font-semibold ${future ? "text-gray-400" : ""}`}>
                {future ? "–" : d.this_week}
              </span>
              <div className="mt-2 flex items-end gap-1 border-b border-gray-300" style={{ height: BAR_AREA }}>
                <span
                  className="w-3 rounded-t-sm bg-gray-400"
                  style={{ height: h(d.last_week) }}
                  title={`지난주 ${d.last_week}개`}
                />
                <span
                  className="w-3 rounded-t-sm bg-primary-500"
                  style={{ height: future ? 0 : h(d.this_week) }}
                  title={`이번 주 ${d.this_week}개`}
                />
              </div>
              <span className="mt-2 text-caption text-gray-700">{WEEKDAY_KO[d.weekday]}</span>
            </div>
          );
        })}
      </div>

      {comment && <p className="mt-4 text-body-md text-gray-800">{comment}</p>}
    </section>
  );
}
