"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Inbox, Megaphone, Handshake, Sparkles, ShieldAlert, Package, CreditCard, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/submissions", label: "Fila de Esteira", icon: Inbox, exact: false },
  { href: "/admin/subscriptions", label: "Destaques", icon: CreditCard, exact: false },
  { href: "/admin/ads", label: "Anúncios", icon: Megaphone, exact: false },
  { href: "/admin/partners", label: "Parceiros", icon: Handshake, exact: false },
  { href: "/admin/plans", label: "Planos de Destaque", icon: Sparkles, exact: false },
  { href: "/admin/reviews", label: "Moderação", icon: ShieldAlert, exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

interface AdminSidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function AdminSidebar({ isMobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href, link.exact);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onCloseMobile}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? "bg-brand-red/10 text-white border border-brand-red/30 shadow-inner shadow-brand-red/5"
                : "text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent"
            }`}
          >
            <Icon
              className={`h-4 w-4 ${
                active ? "text-brand-red" : "text-slate-500 group-hover:text-slate-300"
              }`}
            />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2 px-4 h-16 border-b border-slate-850">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-red to-red-700 shadow-md shadow-brand-red/20">
        <Package className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-base font-bold text-white">PubPascal</p>
        <p className="text-[10px] font-mono uppercase tracking-wider text-brand-red">Admin Console</p>
      </div>
    </div>
  );

  const footer = (
    <div className="px-4 py-4 border-t border-slate-850">
      <Link
        href="/"
        className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Voltar ao portal público
      </Link>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 md:bg-slate-950/80 md:border-r md:border-slate-850 md:backdrop-blur-md z-30">
        {brand}
        {navContent}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative flex flex-col w-72 max-w-[80%] bg-slate-950 border-r border-slate-850 animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-3">
              <button
                onClick={onCloseMobile}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {brand}
            {navContent}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
