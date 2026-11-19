import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { CameraIcon } from "./icons";
import { formatAmPm } from "@/lib/time";
import type { HomeData } from "@/types/home";

/** 오전-1: 최초 진열 상태 + 오늘 생산 */
export default function MorningSection({ data }: { data: HomeData }) {
  const { firstDisplay, production } = data;
  const total = production.reduce((sum, row) => sum + row.made, 0);
  const extraTotal = production.reduce((sum, row) => sum + row.extras.reduce((s, e) => s + e.qty, 0), 0);

  return (
    <>
      {/* 3. 최초 진열 상태 */}
      <div className="mx-6 mt-4">
        {firstDisplay ? (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-300 bg-white py-3 pr-3 pl-5">
            <div className="min-w-0 flex-1">
              <p className="text-title-sm font-semibold">최초 진열 기록 완료</p>
              <p className="text-caption text-gray-700">
                {firstDisplay.time ? formatAmPm(firstDisplay.time) : "직접 입력"}
                {firstDisplay.shelves ? ` · 매대 ${firstDisplay.shelves}곳` : ""} · {firstDisplay.count}개
              </p>
            </div>
            <Link
              href={ROUTES.scan}
              className="flex h-11 shrink-0 items-center rounded-xl bg-primary-500 px-4 text-label-md font-semibold text-white active:bg-primary-600"
            >
              다시 찍기
            </Link>
          </div>
        ) : (
          <>
            <Link
              href={ROUTES.scan}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 text-label-lg font-semibold text-white active:bg-primary-600"
            >
              <CameraIcon />
              진열된 매대 찍고 오늘 만든 수량 기록
            </Link>
            <p className="mt-2 text-center text-caption text-gray-600">
              찍은 수량이 오늘 만든 수량이 되고, 빵 사진도 함께 등록돼요
            </p>
          </>
        )}
      </div>

      {/* 4. 오늘 생산 */}
      <section className="mt-7 px-6">
        <h2 className="text-title-lg font-bold">오늘 생산</h2>

        <div className="mt-3 rounded-2xl bg-gray-100 px-5 pt-5 pb-5">
          {production.length === 0 ? (
            <p className="py-6 text-center text-body-md text-gray-600">
              아직 기록이 없어요.
              <br />
              최초 진열을 찍으면 오늘 만든 수량이 채워져요.
            </p>
          ) : (
            <>
              <div className="flex items-end justify-between border-b border-gray-300 pb-4">
                <div>
                  <p className="text-body-md text-gray-700">오늘 만든 빵</p>
                  <p className="text-display-sm font-bold">
                    {total}
                    <span className="text-title-lg">개</span>
                  </p>
                </div>
                <div className="text-right text-caption text-gray-700">
                  <p>
                    최초 진열 <b className="font-semibold text-black">{firstDisplay?.count ?? total - extraTotal}개</b>
                  </p>
                  {extraTotal > 0 && (
                    <p>
                      추가 생산 <b className="font-semibold text-primary-600">{extraTotal}개</b>
                    </p>
                  )}
                </div>
              </div>

              <ul>
                {production.map((row) => (
                  <li key={row.itemId} className="flex items-center gap-2 border-b border-gray-300 py-3 last:border-0">
                    <span className="flex-1 truncate text-body-md">{row.name}</span>
                    {row.extras.map((e) => (
                      <span key={e.time} className="rounded-md bg-white px-2 py-0.5 text-caption font-semibold text-primary-600">
                        +{e.qty} · {e.time}
                      </span>
                    ))}
                    <span className="w-10 text-right text-title-sm font-semibold">{row.made}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-4 flex gap-2">
            <Link
              href={ROUTES.productionConfirm}
              className="flex h-12 flex-1 items-center justify-center rounded-full border border-gray-400 bg-white text-label-md font-semibold"
            >
              수량 고치기
            </Link>
            <Link
              href={ROUTES.productionAdd}
              className="flex h-12 flex-[1.4] items-center justify-center rounded-full bg-primary-500 text-label-md font-semibold text-white active:bg-primary-600"
            >
              더 구운 빵 기록
            </Link>
          </div>
          <p className="mt-3 text-caption text-gray-600">
            빵을 더 구웠을 때만 기록하면 돼요. 만든 수량은 마감 위험도 계산에 쓰여요.
          </p>
        </div>
      </section>
    </>
  );
}
