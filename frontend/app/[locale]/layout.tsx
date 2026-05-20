import { redirect } from "next/navigation";

const supportedLocales = ["ko", "en"];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!supportedLocales.includes(locale)) {
    redirect("/ko/home");
  }

  return children;
}
