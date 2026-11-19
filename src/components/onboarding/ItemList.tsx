"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { SHELF_LIFE_OPTIONS } from "@/lib/onboarding";
import { ROUTES } from "@/lib/routes";
import { ChevronRightIcon } from "@/components/home/icons";
import { formatNumber } from "@/lib/time";
import { PageIntro } from "./fields";

/** 0-3 판매 품목 목록 */
export default function ItemList() {
  const router = useRouter();
  const { draft, update, ready } = useOnboardingDraft();
  const items = draft.items;

  const finish = () => {
    update({ done: true });
    router.push(`${ROUTES.home}?first=1`);
  };

  return (
    <main>
      <HeaderBar backHref={ROUTES.onboardingHours} progress={{ current: 3, total: 3 }} />
      <PageIntro title="판매하는 품목을 추가해주세요.">품목을 누르면 판매가와 보관 기간을 수정해요.</PageIntro>

      <div className="mt-6 px-6">
        {!ready ? null : items.length === 0 ? (
          <Link
            href={ROUTES.onboardingItemNew}
            className="flex h-20 items-center justify-center rounded-2xl bg-gray-100 text-body-md text-gray-600"
          >
            판매 중인 품목을 추가하세요.
          </Link>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.localId}>
                <Link
                  href={`${ROUTES.onboardingItemNew}?id=${it.localId}`}
                  className="flex items-center gap-2 rounded-2xl bg-gray-100 py-3 pr-3 pl-4"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <b className="truncate text-title-sm font-semibold">{it.name}</b>
                    <span className="shrink-0 text-caption leading-tight text-gray-600">
                      판매가
                      <br />₩{formatNumber(it.price)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md bg-white px-2 py-1 text-label-md font-semibold">
                    {SHELF_LIFE_OPTIONS.find((o) => o.value === it.shelfLife)?.tag}
                  </span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-300">
                    <ChevronRightIcon color="var(--color-black)" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomCta>
        <CtaButton variant="secondary" className="flex-[0.8]" onClick={() => router.push(ROUTES.onboardingItemNew)}>
          품목 추가
        </CtaButton>
        <CtaButton className="flex-[1.2]" disabled={items.length === 0} onClick={finish}>
          가게 설정 완료
        </CtaButton>
      </BottomCta>
    </main>
  );
}
