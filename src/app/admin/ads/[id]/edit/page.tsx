import Link from "next/link";
import { notFound } from "next/navigation";
import { AdForm } from "../../AdForm";
import { updateAd } from "../../actions";
import { getAdById } from "@/utils/queries/admin-ads";
import { isUuid } from "@/utils/queries/admin-submissions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditAdPage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const ad = await getAdById(id);
  if (!ad) notFound();

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
          Editar <span className="text-brand-red">Anúncio</span>
        </h2>
      </header>
      <AdForm action={updateAd} initial={ad} submitLabel="Salvar alterações" />
    </div>
  );
}
