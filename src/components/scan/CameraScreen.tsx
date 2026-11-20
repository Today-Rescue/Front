"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import PurposeSheet from "./PurposeSheet";
import type { ScanPurpose, ShotPhoto } from "./types";
import { useCamera, type ShotQuality } from "./useCamera";

/** 바깥(페이지)에서 촬영 화면을 조작할 때 쓰는 기능 */
export type CameraScreenHandle = {
  /** 갤러리(앨범) 선택창 열기 */
  openGallery: () => void;
  /** 찍어 둔 사진을 모두 비우고 처음 상태로 */
  reset: () => void;
};

type CameraScreenProps = {
  ref?: React.Ref<CameraScreenHandle>;
  /** 무엇을 찍는 중인지. open = 최초 진열(오전-3), close = 재고 기록(①-2) */
  purpose: ScanPurpose;
  /** '바꾸기' 시트에서 '지금 추천'으로 표시할 목적. 없으면 지금 목적 */
  recommended?: ScanPurpose;
  /** 마감 알림 시각 (예: '18:00'). '바꾸기' 시트 안내 문구에 들어감 */
  notifyTime?: string;
  /** 매대 칸 수(썸네일 칸 수). 서버에서 오는 값이 정해지면 연결 */
  maxShelves?: number;
  /** ‹ 클릭. open이면 오전-2, close면 ①-1로 돌아가도록 부모가 처리 */
  onClose: () => void;
  /** '바꾸기' 시트에서 지금과 다른 목적을 골랐을 때 */
  onChangePurpose: (purpose: ScanPurpose) => void;
  /** '장으로 저장/분석' 버튼, 또는 마지막 매대를 찍었을 때. 다음 화면 이동은 부모가 처리 */
  onComplete: (photos: ShotPhoto[]) => void;
};

const COPY: Record<ScanPurpose, { guide: string; purposeName: string; saveVerb: string }> = {
  open: { guide: "진열을 마친 매대 전체를 찍어주세요.", purposeName: "최초 진열", saveVerb: "저장" },
  close: { guide: "남은 빵이 모두 보이게 찍어주세요.", purposeName: "재고 기록", saveVerb: "분석" },
};

// 디자인에서 뽑은 어두운 색 (색 토큰에 없어서 이 화면에서만 직접 지정)
const PANEL_BG = "bg-[#15110e]";
const PILL_BG = "bg-[#0e0b0a]/85";
const FALLBACK_BG = "bg-[#221c18]";

// 좋음 상태만 디자인에 있음. 어두움·흔들림 문구는 같은 형식으로 임시로 정함
function qualityText({ tooDark, shaky }: ShotQuality) {
  return `${tooDark ? "어두워요" : "밝기 좋아요"} · ${shaky ? "흔들림 있음" : "흔들림 없음"}`;
}

function makePhoto(blob: Blob): ShotPhoto {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  return { id, blob, url: URL.createObjectURL(blob) };
}

/**
 * 촬영 화면 (오전-3, ①-2 공용)
 * - 위: 뒤로 가기, 안내 알약, 플래시
 * - 가운데: 촬영 가이드 틀, 그 아래 밝기·흔들림 알약
 * - 아래: 목적 바꾸기, 저장/분석, 매대 썸네일, 갤러리, 촬영 버튼
 * 카메라를 못 쓰면 촬영 버튼이 기기 카메라 앱(사진 선택)으로 바뀜
 */
export default function CameraScreen({
  ref,
  purpose,
  recommended,
  notifyTime,
  maxShelves = 3,
  onClose,
  onChangePurpose,
  onComplete,
}: CameraScreenProps) {
  const { videoRef, status, quality, torchSupported, torchOn, toggleTorch, capture } = useCamera();
  const [photos, setPhotos] = useState<ShotPhoto[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  // 촬영이 끝나기 전에 또 눌러도 사진이 겹치거나 덮어써지지 않게 막음
  const capturingRef = useRef(false);

  // 화면을 떠날 때 미리보기 주소 정리
  const photosRef = useRef<ShotPhoto[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  });
  useEffect(() => {
    return () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
  }, []);

  useImperativeHandle(ref, () => ({
    openGallery: () => galleryInputRef.current?.click(),
    reset: () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
      photosRef.current = [];
      setPhotos([]);
    },
  }));

  const copy = COPY[purpose];
  const full = photos.length >= maxShelves;
  const cameraReady = status === "ready";
  const qualityGood = !quality.tooDark && !quality.shaky;

  function addPhotos(blobs: Blob[]) {
    const room = maxShelves - photos.length;
    const added = blobs.slice(0, Math.max(0, room)).map(makePhoto);
    if (added.length === 0) return;
    const next = [...photos, ...added];
    setPhotos(next);
    if (next.length >= maxShelves) onComplete(next);
  }

  async function handleShutter() {
    if (!cameraReady) {
      captureInputRef.current?.click();
      return;
    }
    if (capturingRef.current) return;
    capturingRef.current = true;
    try {
      const blob = await capture();
      if (blob) addPhotos([blob]);
    } finally {
      capturingRef.current = false;
    }
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    addPhotos(files);
  }

  return (
    <div className={`relative flex h-dvh flex-col overflow-hidden text-white ${cameraReady ? "bg-black" : FALLBACK_BG}`}>
      {/* 카메라 화면 */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover ${cameraReady ? "" : "hidden"}`}
      />

      {/* 상단: 뒤로 가기 · 안내 알약 · 플래시 */}
      <div
        className="relative z-10 flex items-center gap-2 px-6"
        style={{ paddingTop: "calc(12px + env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="뒤로 가기"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-black active:bg-gray-200"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <p className="flex min-h-9 flex-1 items-center justify-center rounded-full bg-white px-3 py-1.5 text-center text-label-md font-bold text-black">
          {copy.guide}
        </p>

        <button
          type="button"
          onClick={toggleTorch}
          disabled={!torchSupported}
          aria-pressed={torchOn}
          aria-label={torchOn ? "플래시 끄기" : "플래시 켜기"}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors ${
            torchOn ? "bg-primary-500 text-white" : `${PILL_BG} ${torchSupported ? "text-white" : "text-white/40"}`
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={torchOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
          </svg>
        </button>
      </div>

      {/* 촬영 가이드 틀 */}
      <div className="relative z-10 min-h-0 flex-1 px-6 pt-6">
        <div className="relative h-full rounded-2xl border-2 border-dashed border-white/90">
          {status === "starting" && (
            <p className="absolute inset-0 flex items-center justify-center text-body-md text-white/70">카메라를 켜는 중이에요.</p>
          )}
          {status === "unavailable" && (
            <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-body-md text-white/80">
              카메라를 쓸 수 없어요. 아래 버튼으로 사진을 찍거나 갤러리에서 골라 주세요.
            </p>
          )}
        </div>
      </div>

      {/* 밝기·흔들림 알약 (틀 아래) */}
      <div className="relative z-10 flex h-14 items-center justify-center">
        {cameraReady && (
          <p className={`flex items-center gap-2 rounded-full ${PILL_BG} px-3 py-1.5 text-caption font-medium`} aria-live="polite">
            <span aria-hidden className={`size-2 rounded-full ${qualityGood ? "bg-success-200" : "bg-primary-400"}`} />
            {qualityText(quality)}
          </p>
        )}
      </div>

      {/* 하단 조작부 */}
      <div
        className={`relative z-10 ${PANEL_BG} px-6 pt-4`}
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={`${copy.purposeName} 바꾸기`}
            className="h-9 rounded-full border border-white/30 px-4 text-label-md font-bold active:bg-white/10"
          >
            {copy.purposeName} <span className="text-primary-300">바꾸기</span>
          </button>
          <button
            type="button"
            disabled={photos.length === 0}
            onClick={() => onComplete(photos)}
            className="text-label-md font-bold text-primary-300 underline underline-offset-4 disabled:text-white/30 disabled:no-underline"
          >
            {Math.max(1, photos.length)}장으로 {copy.saveVerb}
          </button>
        </div>

        {/* 매대 썸네일 */}
        <ul className="mt-3.5 flex gap-2" aria-label="촬영한 매대">
          {Array.from({ length: maxShelves }, (_, i) => {
            const photo = photos[i];
            const n = i + 1;

            if (photo) {
              return (
                <li key={photo.id} aria-label={`매대 ${n} 촬영 완료`} className="relative size-16">
                  <div className="relative size-full overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="size-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent pt-4 pb-1.5 text-center text-label-md font-bold">
                      매대 {n}
                    </span>
                  </div>
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  </span>
                </li>
              );
            }

            if (i === photos.length) {
              return (
                <li
                  key={`slot-${i}`}
                  aria-label={`매대 ${n} 촬영 중`}
                  className="flex size-16 items-center justify-center rounded-2xl border-2 border-primary-500 text-center text-label-md leading-tight font-bold text-primary-300"
                >
                  매대 {n}
                </li>
              );
            }

            return (
              <li
                key={`slot-${i}`}
                aria-label={`매대 ${n} 남음`}
                className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-white/30 text-caption text-white/50"
              >
                매대 {n}
              </li>
            );
          })}
        </ul>

        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={full}
            className="h-12 shrink-0 rounded-full bg-white px-6 text-label-lg font-bold text-black transition-colors active:bg-gray-200 disabled:bg-white/20 disabled:text-white/50"
          >
            갤러리
          </button>

          <button
            type="button"
            onClick={handleShutter}
            disabled={full || status === "starting"}
            className="h-12 flex-1 rounded-full bg-primary-500 text-label-lg font-bold text-white transition-colors active:bg-primary-600 disabled:bg-white/20 disabled:text-white/50"
          >
            진열대 사진 찍기
          </button>
        </div>
      </div>

      <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      <input ref={captureInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} />

      <PurposeSheet
        open={sheetOpen}
        recommended={recommended ?? purpose}
        notifyTime={notifyTime}
        onSelect={(next) => {
          setSheetOpen(false);
          if (next !== purpose) onChangePurpose(next);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
