"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/routes";

/** 결과를 불러오는 중이거나 없을 때 보여주는 간단한 안내 */
export default function ScanNotice({ kind, message }: { kind: "loading" | "missing"; message?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      {kind === "loading" ? (
        <p className="text-body-md text-gray-700">불러오는 중이에요.</p>
      ) : (
        <>
          <p className="text-body-md text-gray-700">{message ?? "스캔 결과를 찾을 수 없어요. 다시 촬영해 주세요."}</p>
          <Link href={ROUTES.scan} className="rounded-full bg-primary-500 px-6 py-3 text-label-md font-bold text-white">
            촬영하러 가기
          </Link>
        </>
      )}
    </main>
  );
}
