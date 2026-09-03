import type { Metadata } from "next";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { PartnerApplyForm } from "./PartnerApplyForm";

export const metadata: Metadata = {
  title: "Tornar-se parceiro — PubPascal-Dev",
  description:
    "Candidate sua empresa a parceira do PubPascal-Dev. Após o envio, sua candidatura passa por moderação antes de aparecer na vitrine de parceiros.",
  robots: { index: false, follow: false },
};

export default function PartnerApplyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <header className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Tornar-se <span className="text-brand-red">parceiro</span>
            </h1>
            <p className="mt-3 text-slate-400 leading-relaxed">
              Apoie o ecossistema Object Pascal. Envie os dados da sua empresa;
              após análise da nossa equipe, sua marca pode aparecer na vitrine de
              parceiros do portal.
            </p>
          </header>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 sm:p-8 shadow-2xl">
            <PartnerApplyForm />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
