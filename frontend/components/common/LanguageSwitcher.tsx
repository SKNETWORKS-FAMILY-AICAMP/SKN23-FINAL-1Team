"use client";

import { usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { isLocale, locales, type Locale, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function withLocale(pathname: string, locale: Locale) {
  const segments = pathname.split("/").filter(Boolean);

  if (isLocale(segments[0])) {
    segments[0] = locale;
  } else {
    segments.unshift(locale);
  }

  return `/${segments.join("/")}`;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale);

    if (!pathname.startsWith("/api") && !pathname.startsWith("/backend")) {
      router.push(withLocale(pathname, nextLocale));
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white/80 p-1 text-[11px] font-bold text-stone-500 shadow-sm",
        className,
      )}
      aria-label="Language"
    >
      <Languages className="ml-1 h-3.5 w-3.5" />
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => handleLocaleChange(item)}
          className={cn(
            "rounded-full px-2 py-1 transition-colors",
            locale === item
              ? "bg-stone-950 text-white"
              : "text-stone-500 hover:bg-stone-100 hover:text-stone-900",
          )}
        >
          {item === "ko" ? "KO" : "EN"}
        </button>
      ))}
    </div>
  );
}
