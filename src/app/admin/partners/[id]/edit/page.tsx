import Link from "next/link";
import { notFound } from "next/navigation";
import { PartnerForm } from "../../PartnerForm";
import { updatePartner } from "../../actions";
import { getPartnerById } from "@/utils/queries/admin-partners";
import { isUuid } from "@/utils/queries/admin-submissions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPartnerPage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const partner = await getPartnerById(id);
  if (!partner) notFound();

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
          Editar <span className="text-brand-red">Parceiro</span>
        </h2>
      </header>
      <PartnerForm
        action={updatePartner}
        initial={partner}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
