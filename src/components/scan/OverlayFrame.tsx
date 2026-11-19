import { APP_MAX_WIDTH } from "@/components/common/layout";

type OverlayFrameProps = {
  /** 스크린리더용 이름 */
  label: string;
  /** 가운데 안내 카드 안의 내용 */
  card: React.ReactNode;
  /** 화면 아래 버튼 영역 */
  actions: React.ReactNode;
  /** 카드를 조금 더 좁게 (①-3) */
  narrow?: boolean;
};

/**
 * 촬영 화면 위를 어둡게 덮고 가운데 안내 카드를 띄우는 틀 (①-3, ①-4, ①-5 공용)
 * 뒤의 촬영 화면은 그대로 두고 이 틀만 위에 올리면 됨
 */
export default function OverlayFrame({ label, card, actions, narrow = false }: OverlayFrameProps) {
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-40 flex justify-center bg-[#0e0b0a]/85">
      <div className="flex w-full flex-col" style={{ maxWidth: APP_MAX_WIDTH }}>
        <div className="flex flex-1 items-center">
          <div className={`${narrow ? "mx-10" : "mx-9"} w-full rounded-3xl bg-gray-200 px-5 py-5.5 text-center text-black`}>{card}</div>
        </div>
        <div className="px-6" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
          {actions}
        </div>
      </div>
    </div>
  );
}
