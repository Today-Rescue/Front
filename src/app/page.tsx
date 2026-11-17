import { Suspense } from "react";
import HomeScreen from "@/components/home/HomeScreen";

/**
 * 오늘 메인 (C) - 오전-1 / ① 마감 메인
 *
 * 테스트용 주소:
 *   /?mode=morning              오전 판매 모드
 *   /?mode=closing              오후 마감 모드
 *   /?now=18:30                 지금 시각을 18:30으로 가정 (모드 자동 전환 확인)
 *   /?data=empty                기록이 하나도 없는 첫날 상태
 *   /?mock=1                    서버 안 부르고 mock 데이터만
 *   /?first=1                   0-5 첫날 메인 (온보딩 끝나면 자동으로 이 주소로 옴)
 *   (같이 쓰기: /?mode=closing&data=empty)
 *
 * 이 프로젝트는 cacheComponents 설정이 켜져 있어서,
 * 주소의 ?값(searchParams)을 읽는 부분은 <Suspense> 안에 넣어야 빌드가 된다.
 */
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <HomeWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeWithParams({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const sp = await searchParams;
  const pick = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);
  const mode = pick("mode");

  return (
    <HomeScreen
      mode={mode === "morning" || mode === "closing" ? mode : undefined}
      now={pick("now")}
      empty={pick("data") === "empty"}
      mockOnly={pick("mock") === "1"}
      first={pick("first") === "1"}
    />
  );
}
