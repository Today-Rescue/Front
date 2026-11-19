"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { useSlowFlag } from "@/hooks/useSlowFlag";
import { api } from "@/lib/api";
import { createStore, placeFromLocation, searchDong, type Place } from "@/lib/onboarding";
import { ROUTES } from "@/lib/routes";
import { CheckSquareIcon, PinIcon } from "@/components/home/icons";
import { ErrorNote, FieldLabel, PageIntro, inputClass } from "./fields";

/** 0-1 가게 정보 · 위치 */
export default function StoreForm() {
  const router = useRouter();
  const { draft, update, ready } = useOnboardingDraft();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const slow = useSlowFlag(saving);

  // 저장돼 있던 위치가 있으면 검색칸과 결과에 다시 보여줌
  useEffect(() => {
    if (ready && draft.place && !query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장값 복원
      setQuery(draft.place.dong);
      setResults([draft.place]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // 입력이 멈추고 0.3초 뒤에 검색
  useEffect(() => {
    const q = query.trim();
    if (!q || q === draft.place?.dong) return;
    const t = setTimeout(async () => setResults(await searchDong(q)), 300);
    return () => clearTimeout(t);
  }, [query, draft.place?.dong]);

  const findMyLocation = () => {
    if (!navigator.geolocation) return setError("이 기기에서는 위치를 찾을 수 없어요.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const place = await placeFromLocation(coords.latitude, coords.longitude);
        setLocating(false);
        if (!place) return setError("현재 위치의 동을 찾지 못했어요. 동 이름으로 검색해 주세요.");
        setQuery(place.dong);
        setResults([place]);
        update({ place });
      },
      () => {
        setLocating(false);
        setError("위치 권한이 없어요. 동 이름으로 검색해 주세요.");
      },
      { timeout: 10_000 },
    );
  };

  const canNext = draft.name.trim().length > 0 && !!draft.place && !saving;

  const next = async () => {
    setSaving(true);
    setError("");
    try {
      if (draft.storeId) {
        // 뒤로 와서 고친 경우: 새로 만들지 않고 수정
        await api.patch(`/stores/${draft.storeId}`, {
          name: draft.name,
          lat: draft.place!.lat,
          lng: draft.place!.lng,
          dong: draft.place!.dong,
        });
      } else {
        const storeId = await createStore(draft);
        update({ storeId });
      }
      router.push(ROUTES.onboardingHours);
    } catch (err) {
      console.error(err);
      setError("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <HeaderBar backHref={ROUTES.onboardingStart} progress={{ current: 1, total: 3 }} />
      <PageIntro title="가게 정보를 입력해주세요.">
        위치는 한 번만 저장해요.
        <br />
        이후에는 같은 위치의 날씨를 불러와요.
      </PageIntro>

      <div className="mt-7 px-6">
        <FieldLabel required>가게명</FieldLabel>
        <input
          className={inputClass}
          placeholder="예: 버터롤"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          enterKeyHint="next"
        />
      </div>

      <section className="mx-6 mt-6 rounded-2xl bg-gray-100 p-4">
        <FieldLabel required>위치정보</FieldLabel>

        <label className="flex h-12 items-center gap-2 rounded-xl bg-white px-3">
          <PinIcon size={22} color="var(--color-black)" />
          <input
            className="h-full flex-1 bg-transparent text-body-lg outline-none placeholder:text-gray-500"
            placeholder="동 이름으로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <button
          type="button"
          onClick={findMyLocation}
          disabled={locating}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-primary-500 text-label-md font-semibold text-white active:bg-primary-600 disabled:opacity-60"
        >
          {locating ? "위치 찾는 중…" : "현재 위치로 찾기"}
        </button>

        {results.length > 0 && (
          <ul className="mt-2 space-y-2">
            {results.map((p) => {
              const selected = draft.place?.dong === p.dong && draft.place?.address === p.address;
              return (
                <li key={`${p.dong}-${p.address}`}>
                  <button
                    type="button"
                    onClick={() => update({ place: p })}
                    aria-pressed={selected}
                    className={`flex w-full items-center rounded-xl border px-4 py-3 text-left ${
                      selected ? "border-primary-500 bg-primary-50" : "border-transparent bg-white"
                    }`}
                  >
                    <span className="flex-1">
                      <span className="block text-title-sm font-semibold">{p.dong}</span>
                      <span className="block text-caption text-gray-600">{p.address}</span>
                    </span>
                    {selected && <CheckSquareIcon size={26} color="var(--color-primary-500)" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BottomCta
        note={
          error ? <ErrorNote>{error}</ErrorNote> : slow ? "서버를 깨우는 중이에요. 처음엔 최대 1분 걸릴 수 있어요." : undefined
        }
      >
        <CtaButton disabled={!canNext} onClick={next}>
          {saving ? "저장 중…" : "다음"}
        </CtaButton>
      </BottomCta>
    </main>
  );
}
