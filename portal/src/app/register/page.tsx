import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import RegisterClient from "./RegisterClient";

// Server shell: renders locale-aware chrome (HeaderServer + Footer) around the
// client register form. The page must be a server component so the server-wrapper
// pattern (ADR-038/039) can inject the dict; client logic lives in RegisterClient.
export default function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100 font-sans">
      <Header />
      <RegisterClient />
      <Footer />
    </div>
  );
}
