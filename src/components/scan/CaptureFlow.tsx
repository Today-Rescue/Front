"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import {
  analyzePhotos,
  blankScan,
  fetchNotifyTime,
  fetchScanPurpose,
  saveScanSession,
  type ScanApiResponse,
} from "@/lib/scan";
import AnalyzingOverlay from "./AnalyzingOverlay";
import CameraScreen, { type CameraScreenHandle } from "./CameraScreen";
import FailedOverlay from "./FailedOverlay";
import PartialResultOverlay from "./PartialResultOverlay";
import PurposeSheet from "./PurposeSheet";
import type { ScanPurpose, ShotPhoto } from "./types";

type Phase = "capture" | "analyzing" | "partial" | "failed" | "dark";

/** 20초가 넘게 걸리면 '오래 걸려요' 문구로 바꿈 */
const SLOW_AFTER_MS = 20_000;
/** 분석 단계 표시를 이 간격으로 한 칸씩 진행 (서버가 단계 정보를 주지 않아서 시간으로 흉내냄) */
const STEP_EVERY_MS = 2_500;
/** 추천 목적을 서버에서 못 받아도 이 시간 뒤에는 시계 기준으로 시트를 보여줌 */
const PURPOSE_FALLBACK_MS = 2_500;

/**
 * 촬영 흐름 (주소 /scan)
 * 목적 선택 시트(오전-2, ①-1) → 촬영(오전-3, ①-2) → 분석 중(①-3) → 결과에 따라
 *   ok      → 오전-4(최초 진열) 또는 ②(재고 기록)로 이동
 *   partial → ①-4 일부만 인식
 *   failed  → ①-5 인식 실패
 *   too_dark→ 사진이 어두움 안내 (시안 없음)
 */
export default function CaptureFlow() {
  const router = useRouter();
  const cameraRef = useRef<CameraScreenHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  const photosRef = useRef<ShotPhoto[]>([]);
  const scanRef = useRef<ScanApiResponse | null>(null);

  const [recommended, setRecommended] = useState<ScanPurpose | null>(null);
  const [chosen, setChosen] = useState<ScanPurpose | null>(null);
  const [notifyTime, setNotifyTime] = useState("18:00");
  const [sheetOpen, setSheetOpen] = useState(true);
  const [phase, setPhase] = useState<Phase>("capture");
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [partialScan, setPartialScan] = useState<ScanApiResponse | null>(null);

  const purpose = chosen ?? recommended ?? "open";

  // 다른 화면에 갔다가 돌아오면(이전 화면이 보존돼 있음) 처음 상태로 되돌림.
  // 안 그러면 '다시 찍기'로 돌아왔을 때 옛 오버레이·사진이 그대로 남아 있음
  useEffect(() => {
    scanRef.current = null;
    photosRef.current = [];
    cameraRef.current?.reset();
    /* eslint-disable react-hooks/set-state-in-effect -- 들어올 때마다 처음 상태로 */
    setPhase("capture");
    setSheetOpen(true);
    setChosen(null);
    setFailCount(0);
    setPartialScan(null);
    setStep(0);
    setSlow(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // 추천 목적과 마감 알림 시각 불러오기
  useEffect(() => {
    let cancelled = false;
    const fallback = window.setTimeout(() => {
      if (!cancelled) setRecommended((current) => current ?? (new Date().getHours() < 18 ? "open" : "close"));
    }, PURPOSE_FALLBACK_MS);

    fetchScanPurpose()
      .then((value) => !cancelled && setRecommended(value))
      .catch(() => {});
    fetchNotifyTime()
      .then((value) => !cancelled && setNotifyTime(value))
      .catch(() => {});

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      abortRef.current?.abort();
    };
  }, []);

  const goNext = (scan: ScanApiResponse, photoCount: number) => {
    saveScanSession({ scan, photoCount });
    const path = scan.purpose === "open" ? ROUTES.productionConfirm : ROUTES.scanResult;
    router.push(`${path}?scan=${scan.scan_id}`);
  };

  const handleResult = (scan: ScanApiResponse, photoCount: number) => {
    scanRef.current = scan;
    switch (scan.status) {
      case "ok":
        setFailCount(0);
        goNext(scan, photoCount);
        break;
      case "partial":
        setFailCount(0);
        setPartialScan(scan);
        setPhase("partial");
        break;
      case "failed":
        setFailCount((count) => count + 1);
        cameraRef.current?.reset();
        setPhase("failed");
        break;
      case "too_dark":
        cameraRef.current?.reset();
        setPhase("dark");
        break;
      default:
        // timeout: 20초 지연 화면으로 두고 '다시 시도'를 보여줌
        setSlow(true);
    }
  };

  const analyze = async (photos: ShotPhoto[]) => {
    photosRef.current = photos;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("analyzing");
    setStep(0);
    setSlow(false);
    const stepTimer = window.setInterval(() => setStep((current) => Math.min(current + 1, 3)), STEP_EVERY_MS);
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);

    try {
      const scan = await analyzePhotos(
        photos.map((photo) => photo.blob),
        purpose,
        controller.signal,
      );
      if (!controller.signal.aborted) handleResult(scan, photos.length);
    } catch {
      // 통신 실패: 지연 화면으로 두고 '다시 시도'를 누르게 함 (찍은 사진은 그대로 있음)
      if (!controller.signal.aborted) setSlow(true);
    } finally {
      window.clearInterval(stepTimer);
      window.clearTimeout(slowTimer);
    }
  };

  /** 사진 없이 직접 입력: 서버가 찾은 결과가 있으면 그 위에서, 없으면 빈 수량으로 */
  const goManual = async () => {
    abortRef.current?.abort();
    try {
      const scan = scanRef.current ?? (await blankScan(purpose));
      goNext(scan, 0);
    } catch {
      setPhase("capture");
    }
  };

  return (
    <>
      <CameraScreen
        ref={cameraRef}
        purpose={purpose}
        recommended={recommended ?? purpose}
        notifyTime={notifyTime}
        onClose={() => setSheetOpen(true)}
        onChangePurpose={setChosen}
        onComplete={analyze}
      />

      <PurposeSheet
        open={sheetOpen && recommended !== null && phase === "capture"}
        recommended={recommended ?? "open"}
        notifyTime={notifyTime}
        onSelect={(next) => {
          setChosen(next);
          setSheetOpen(false);
        }}
        onClose={() => router.push(ROUTES.home)}
      />

      {phase === "analyzing" && (
        <AnalyzingOverlay
          currentStep={step}
          slow={slow}
          onCancel={() => {
            abortRef.current?.abort();
            setPhase("capture");
          }}
          onRetry={() => analyze(photosRef.current)}
          onManual={goManual}
        />
      )}

      {phase === "partial" && partialScan && (
        <PartialResultOverlay
          found={partialScan.found_count}
          total={partialScan.total_count}
          missing={partialScan.items
            .filter((item) => !item.found)
            .map((item) => ({ name: item.name, note: item.expected_left > 0 ? `예상 ${item.expected_left}개` : undefined }))}
          onAddShelf={() => setPhase("capture")}
          onContinue={() => goNext(partialScan, photosRef.current.length)}
        />
      )}

      {(phase === "failed" || phase === "dark") && (
        <FailedOverlay
          variant={phase === "dark" ? "dark" : "notFound"}
          failedTwice={failCount >= 2}
          onGallery={() => {
            setPhase("capture");
            cameraRef.current?.openGallery();
          }}
          onRetake={() => setPhase("capture")}
          onManual={goManual}
        />
      )}
    </>
  );
}
