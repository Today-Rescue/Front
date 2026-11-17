"use client";

import { useCallback, useEffect, useState } from "react";
import { EMPTY_DRAFT, loadDraft, saveDraft, type OnboardingDraft } from "@/lib/onboarding";

/** 이미지 미리보기는 용량이 커서 브라우저 저장소 대신 메모리에만 둔다 (새로고침하면 사라짐) */
const previewCache = new Map<string, string>();

/**
 * 온보딩 입력값. 화면을 넘겨도 유지되도록 localStorage 에 저장한다.
 * ready 가 false 인 동안은 아직 저장된 값을 읽는 중이다.
 */
export function useOnboardingDraft() {
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 화면이 뜬 뒤에만 읽을 수 있음
    setDraft({
      ...saved,
      items: saved.items.map((it) => ({ ...it, imagePreview: previewCache.get(it.localId) })),
    });
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<OnboardingDraft> | ((d: OnboardingDraft) => OnboardingDraft)) => {
    setDraft((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      next.items.forEach((it) => {
        if (it.imagePreview) previewCache.set(it.localId, it.imagePreview);
      });
      saveDraft(next);
      return next;
    });
  }, []);

  return { draft, update, ready };
}
