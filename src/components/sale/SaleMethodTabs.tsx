import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type SaleMethod = "discount" | "bundle";

const METHODS: { key: SaleMethod; label: string; href: string }[] = [
  { key: "discount", label: "일괄 할인", href: ROUTES.saleDiscount },
  { key: "bundle", label: "세트 구성", href: ROUTES.saleBundle },
];

/** ③-a / ③-b 상단의 '일괄 할인 | 세트 구성' 전환 탭 */
export default function SaleMethodTabs({ active }: { active: SaleMethod }) {
  return (
    <nav aria-label="판매 방법" className="flex rounded-xl bg-gray-100 p-1">
      {METHODS.map((m) => {
        const isActive = m.key === active;
        return (
          <Link
            key={m.key}
            href={m.href}
            replace
            aria-current={isActive ? "page" : undefined}
            className={`flex h-10 flex-1 items-center justify-center rounded-lg text-label-md transition-colors ${
              isActive ? "bg-white font-semibold text-black shadow-sm" : "font-medium text-gray-600"
            }`}
          >
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
