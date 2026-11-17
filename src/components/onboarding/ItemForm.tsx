"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/common/HeaderBar";
import { BottomCta, CtaButton } from "@/components/common/CtaButton";
import { useOnboardingDraft } from "@/hooks/useOnboardingDraft";
import { useSlowFlag } from "@/hooks/useSlowFlag";
import { SHELF_LIFE_OPTIONS, createItem, updateItem, type DraftItem, type ShelfLife } from "@/lib/onboarding";
import { ROUTES } from "@/lib/routes";
import { formatNumber } from "@/lib/time";
import { Chip, ErrorNote, FieldLabel, inputClass } from "./fields";

/** 0-4 품목 추가 / 수정 (editId 가 있으면 수정) */
export default function ItemForm({ editId }: { editId?: string }) {
  const router = useRouter();
  const { draft, update, ready } = useOnboardingDraft();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState(""); // 숫자만 ("2500")
  const [shelfLife, setShelfLife] = useState<ShelfLife | null>(null);
  const [image, setImage] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const slow = useSlowFlag(saving);

  const editing = draft.items.find((it) => it.localId === editId);

  // 수정이면 기존 값 채우기
  useEffect(() => {
    if (!ready || !editing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 품목 값으로 입력칸 채우기
    setName(editing.name);
    setPrice(String(editing.price));
    setShelfLife(editing.shelfLife);
    setImage(editing.imagePreview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const canSave = name.trim() && Number(price) > 0 && shelfLife && !saving;

  const pickImage = (file?: File) => {
    if (!file) return;
    // TODO(C): POST /uploads 로 올리고 받은 주소를 image_url 로 저장 (응답 모양 확인 필요)
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!shelfLife) return;
    setSaving(true);
    setError("");
    const item: DraftItem = {
      localId: editing?.localId ?? crypto.randomUUID(),
      serverId: editing?.serverId,
      name: name.trim(),
      price: Number(price),
      shelfLife,
      imagePreview: image,
    };
    try {
      if (draft.storeId) {
        if (item.serverId) await updateItem(item.serverId, item);
        else item.serverId = await createItem(draft.storeId, item);
      }
      update((d) => ({
        ...d,
        items: editing ? d.items.map((it) => (it.localId === item.localId ? item : it)) : [...d.items, item],
      }));
      router.push(ROUTES.onboardingItems);
    } catch (err) {
      console.error(err);
      setError("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const help = SHELF_LIFE_OPTIONS.find((o) => o.value === shelfLife)?.help;

  return (
    <main>
      {/* < 누르면 저장하지 않고 목록으로 */}
      <HeaderBar backHref={ROUTES.onboardingItems} progress={{ current: 3, total: 3 }} />

      {/* 2. 제품 이미지 등록 */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mx-5 mt-2 flex w-[calc(100%-40px)] items-center gap-3 rounded-2xl bg-gray-100 px-5 py-4 text-left"
      >
        <span className="flex-1">
          <span className="block text-title-sm font-semibold">제품 이미지 등록</span>
          <span className="mt-1 block text-caption text-gray-600">
            나중에 추가해도 돼요. 첫 매대 촬영 때
            <br />
            찍힌 빵으로 자동 등록할 수 있어요.
          </span>
        </span>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- 사용자가 고른 사진 미리보기
          <img src={image} alt="선택한 제품 사진" className="size-14 rounded-xl object-cover" />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-xl bg-gray-300" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        )}
      </button>
      {/* 휴대폰에서는 '사진 찍기 / 앨범에서 고르기' 선택창이 뜬다 */}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />

      {/* 3. 품목명 */}
      <div className="mt-7 px-5">
        <FieldLabel required>품목명</FieldLabel>
        <input className={inputClass} placeholder="예: 버터롤" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* 4. 판매가 */}
      <div className="mt-6 px-5">
        <FieldLabel required>판매가</FieldLabel>
        <label className="flex h-14 items-center rounded-xl bg-gray-100 px-4 focus-within:ring-2 focus-within:ring-primary-300">
          <input
            inputMode="numeric"
            className="h-full flex-1 bg-transparent text-body-lg outline-none placeholder:text-gray-500"
            placeholder="0"
            value={price ? formatNumber(Number(price)) : ""}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, "").slice(0, 9))}
          />
          <span className="text-body-md text-gray-600">원</span>
        </label>
        <p className="mt-2 text-caption text-gray-600">품목 1개의 판매 가격을 입력해 주세요.</p>
      </div>

      {/* 5. 보관 기간 */}
      <div className="mt-6 px-5">
        <FieldLabel required>보관 기간</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {SHELF_LIFE_OPTIONS.map((o) => (
            <Chip key={o.value} selected={shelfLife === o.value} onClick={() => setShelfLife(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
        {help && <p className="mt-3 text-body-md text-gray-800">{help}</p>}
      </div>

      <BottomCta
        note={
          error ? <ErrorNote>{error}</ErrorNote> : slow ? "서버를 깨우는 중이에요. 처음엔 최대 1분 걸릴 수 있어요." : undefined
        }
      >
        <CtaButton disabled={!canSave} onClick={save}>
          {saving ? "저장 중…" : editing ? "수정 완료" : "추가 완료"}
        </CtaButton>
      </BottomCta>
    </main>
  );
}
