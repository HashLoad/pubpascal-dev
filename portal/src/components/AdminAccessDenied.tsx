import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function AdminAccessDenied() {
  return (
    <div className="min-h-screen w-full bg-brand-slate text-slate-100 font-sans flex items-center justify-center px-4 py-16 relative overflow-hidden bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_70%)]">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[420px] h-[420px] bg-brand-red/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-[420px] h-[420px] bg-brand-blue/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-xl w-full rounded-3xl border border-slate-800 bg-slate-950/70 backdrop-blur-md p-8 md:p-12 text-center shadow-2xl">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-brand-red to-red-700 flex items-center justify-center shadow-lg shadow-brand-red/30 mb-6">
          <ShieldAlert className="h-10 w-10 text-white" />
        </div>

        <p className="text-xs font-mono uppercase tracking-[0.3em] text-brand-red mb-3">
          Erro 403
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
          Acesso <span className="text-brand-red">Negado</span>
        </h1>
        <p className="text-slate-400 leading-relaxed mb-8">
          Esta área é restrita a administradores do portal PubPascal-Dev.
          Sua conta não possui o perfil <span className="font-mono text-xs bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded text-brand-red">role = &apos;admin&apos;</span> exigido
          para operar o console administrativo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 hover:bg-brand-red-dark hover:shadow-brand-red/30 transition-all"
          >
            <Home className="h-4 w-4" />
            <span>Voltar à página inicial</span>
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-5 py-2.5 text-sm font-semibold transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Meu painel</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
