import { Suspense } from "react";
import ItemForm from "@/components/onboarding/ItemForm";

// 0-4 품목 추가 / 수정 (C)
// 수정할 때는 /onboarding/items/new?id=품목ID
// (?값을 읽는 부분은 cacheComponents 설정 때문에 <Suspense> 안에 둔다)
export default function Page({ searchParams }: PageProps<"/onboarding/items/new">) {
  return (
    <Suspense fallback={null}>
      <ItemFormWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function ItemFormWithParams({ searchParams }: Pick<PageProps<"/onboarding/items/new">, "searchParams">) {
  const { id } = await searchParams;
  return <ItemForm editId={typeof id === "string" ? id : undefined} />;
}
