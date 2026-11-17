"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "starting" | "ready" | "unavailable";
/** 밝기와 흔들림을 따로 알려줌 (둘 다 false면 촬영하기 좋은 상태) */
export type ShotQuality = { tooDark: boolean; shaky: boolean };

// 밝기·흔들림 판정 기준. 0~255 값이고 임시로 정한 숫자라 실제로 써 보면서 조정
const DARK_LUMA = 50;
const SHAKY_DIFF = 12;
const SAMPLE_INTERVAL_MS = 400;
const SAMPLE_W = 32;
const SAMPLE_H = 24;

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

/**
 * 후면 카메라 연결 + 촬영 + 플래시 + 밝기·흔들림 측정
 * - 카메라를 못 쓰면(권한 거절, HTTPS 아님, 카메라 없음) status가 'unavailable'
 * - 플래시는 기기가 지원할 때만 (torchSupported)
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [quality, setQuality] = useState<ShotQuality>({ tooDark: false, shaky: false });

  // 카메라 켜기 / 끄기
  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as TorchCapabilities | undefined;
        setTorchSupported(Boolean(capabilities?.torch));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // 밝기·흔들림을 일정 간격으로 측정 (작게 줄인 화면의 평균 밝기, 이전 화면과의 차이)
  useEffect(() => {
    if (status !== "ready") return;

    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let prevLuma: Float32Array | null = null;

    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;

      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
      const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);

      const luma = new Float32Array(SAMPLE_W * SAMPLE_H);
      let sum = 0;
      for (let i = 0; i < luma.length; i++) {
        const v = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
        luma[i] = v;
        sum += v;
      }
      const average = sum / luma.length;

      let diff = 0;
      if (prevLuma) {
        for (let i = 0; i < luma.length; i++) diff += Math.abs(luma[i] - prevLuma[i]);
        diff /= luma.length;
      }
      prevLuma = luma;

      const next = { tooDark: average < DARK_LUMA, shaky: diff > SHAKY_DIFF };
      setQuality((prev) => (prev.tooDark === next.tooDark && prev.shaky === next.shaky ? prev : next));
    }, SAMPLE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [status]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      // 기기가 거절하면 상태를 그대로 둠
    }
  }, [torchOn, torchSupported]);

  /** 지금 화면을 사진(JPEG)으로 찍기. 카메라가 준비되지 않았으면 null */
  const capture = useCallback((): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return Promise.resolve(null);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9));
  }, []);

  return { videoRef, status, quality, torchSupported, torchOn, toggleTorch, capture };
}
