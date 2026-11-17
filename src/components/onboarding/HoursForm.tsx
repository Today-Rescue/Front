"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { useSlowFlag } from "@/hooks/useSlowFlag";
import { DAYS, updateStoreHours } from "@/lib/onboarding";
import { ROUTES } from "@/lib/routes";
import { clockToMinutes, minutesToClock } from "@/lib/time";
import { Chip, ErrorNote, FieldLabel, InfoNote, PageIntro } from "./fields";

/** 0-2 영업시간 */
export default function HoursForm() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const slow = useSlowFlag(saving);

  const alertClock = minutesToClock(clockToMinutes(draft.closeTime) - draft.alertHours * 60);
  const validTime = clockToMinutes(draft.openTime) < clockToMinutes(draft.closeTime);

  const toggleDay = (day: string) =>
    update({
      closedDays: draft.closedDays.includes(day)
        ? draft.closedDays.filter((d) => d !== day)
        : [...draft.closedDays, day],
    });

  const next = async () => {
    setSaving(true);
    setError("");
    try {
      if (draft.storeId) await updateStoreHours(draft.storeId, draft);
      router.push(ROUTES.onboardingItems);
    } catch (err) {
      console.error(err);
      setError("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <HeaderBar backHref={ROUTES.onboardingStore} progress={{ current: 2, total: 3 }} />
      <PageIntro title="영업시간을 알려주세요.">
        마감 전에 남은 빵을 확인하라고 알려드리고,
        <br />
        판매 속도를 계산할 때 써요.
      </PageIntro>

      {/* 3. 오픈 · 마감 */}
      <div className="mt-7 grid grid-cols-2 gap-3 px-5">
        <TimeField label="오픈" value={draft.openTime} onChange={(openTime) => update({ openTime })} />
        <TimeField label="마감" value={draft.closeTime} onChange={(closeTime) => update({ closeTime })} />
      </div>
      {!validTime && <ErrorNote>마감 시간은 오픈 시간보다 늦어야 해요.</ErrorNote>}

      {/* 4. 쉬는 날 */}
      <div className="mt-7 px-5">
        <FieldLabel>쉬는 날</FieldLabel>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => (
            <Chip key={d.value} selected={draft.closedDays.includes(d.value)} onClick={() => toggleDay(d.value)}>
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* 5. 마감 알림 */}
      <div className="mt-7 px-5">
        <FieldLabel>마감 알림</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((h) => (
            <Chip key={h} selected={draft.alertHours === h} onClick={() => update({ alertHours: h })}>
              {h}시간 전
            </Chip>
          ))}
        </div>
        <div className="mt-3">
          <InfoNote>영업일마다 {alertClock}에 남은 빵 확인 알림을 보내드려요</InfoNote>
        </div>
      </div>

      <BottomCta
        note={
          error ? <ErrorNote>{error}</ErrorNote> : slow ? "서버를 깨우는 중이에요. 처음엔 최대 1분 걸릴 수 있어요." : undefined
        }
      >
        <CtaButton disabled={!validTime || saving} onClick={next}>
          {saving ? "저장 중…" : "다음"}
        </CtaButton>
      </BottomCta>
    </main>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <FieldLabel required>{label}</FieldLabel>
      <span className="relative flex h-14 items-center rounded-xl bg-gray-100 px-4">
        <input
          type="time"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="w-full bg-transparent text-title-lg font-semibold outline-none"
        />
      </span>
    </label>
  );
}
