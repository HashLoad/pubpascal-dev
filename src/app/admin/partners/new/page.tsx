import Link from "next/link";
import { PartnerForm } from "../PartnerForm";
import { createPartner } from "../actions";

export const dynamic = "force-dynamic";

export default function NewPartnerPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <Link
          href="/admin/partners"
          className="text-xs font-mono uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Parceiros
        </Link>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
          Novo <span className="text-brand-red">Parceiro</span>
        </h2>
      </header>
      <PartnerForm action={createPartner} submitLabel="Criar parceiro" />
    </div>
  );
}
