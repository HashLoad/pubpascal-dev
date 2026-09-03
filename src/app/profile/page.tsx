import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import ProfileClient from "./ProfileClient";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";

export default async function ProfilePage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100 font-sans">
      <Header />
      <ProfileClient dict={dict.account} locale={locale} />
      <Footer />
    </div>
  );
}
