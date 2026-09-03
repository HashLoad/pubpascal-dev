import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import LoginClient from "./LoginClient";

// Server shell: renders locale-aware chrome (HeaderServer + Footer) around the
// client login form. The page must be a server component so the server-wrapper
// pattern (ADR-038/039) can inject the dict; client logic lives in LoginClient.
export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100 font-sans">
      <Header />
      <LoginClient />
      <Footer />
    </div>
  );
}
