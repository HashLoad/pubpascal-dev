import Link from "next/link";
import { AdForm } from "../AdForm";
import { createAd } from "../actions";

export const dynamic = "force-dynamic";

export default function NewAdPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <Link
          href="/admin/ads"
          className="text-xs font-mono uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Anúncios
        </Link>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
          Novo <span className="text-brand-red">Anúncio</span>
        </h2>
      </header>
      <AdForm action={createAd} submitLabel="Criar anúncio" />
    </div>
  );
}
