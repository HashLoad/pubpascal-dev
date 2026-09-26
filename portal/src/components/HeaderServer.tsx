import Header from "./Header";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";

// Thin server wrapper (ADR-038): resolves locale + dict server-side and injects
// the `header` slice into the client Header, so every call site stays prop-free.
export default async function HeaderServer() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return <Header dict={dict.header} />;
}
