type PhotoBannerProps = {
  /** 사진 위 라벨 (예: '진열 사진 3장 · 오전 9:10') */
  label: string;
  /** 찍은 사진 주소. 없으면 회색 자리 표시 */
  photoUrl?: string;
  /** 높이 클래스. 오전-4는 h-28, ②는 h-32 */
  heightClass?: string;
  /** '다시 찍기' 클릭 */
  onRetake: () => void;
  /** 라벨과 '다시 찍기' 위치. 오전-4는 top, ②는 bottom */
  controlsAt?: "top" | "bottom";
};

/** 촬영한 매대 사진 + 라벨 + '다시 찍기' (오전-4, ② 공용) */
export default function PhotoBanner({ label, photoUrl, heightClass = "h-28", onRetake, controlsAt = "bottom" }: PhotoBannerProps) {
  const edge = controlsAt === "top" ? "top-3" : "bottom-3";
  return (
    <div className={`relative overflow-hidden rounded-[20px] bg-gray-200 ${heightClass}`}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="촬영한 매대 사진" className="size-full object-cover" />
      ) : (
        // 사진이 없을 때 보이는 자리 표시 (디자인의 회색 네모)
        <span aria-hidden className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-gray-400/60" />
      )}

      <span className={`absolute ${edge} left-3 rounded-full bg-primary-50 px-3 py-1.5 text-caption font-medium text-primary-700`}>
        {label}
      </span>
      <button
        type="button"
        onClick={onRetake}
        className={`absolute right-3 ${edge} h-10 rounded-xl bg-white px-4 text-label-md font-bold text-primary-600 active:bg-gray-100`}
      >
        다시 찍기
      </button>
    </div>
  );
}
