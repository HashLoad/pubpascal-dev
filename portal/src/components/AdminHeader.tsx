"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, LogOut, Shield, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Visão Geral",
  "/admin/submissions": "Fila de Esteira",
  "/admin/partners-ads": "Parceiros & Ads",
  "/admin/plans": "Planos de Destaque",
};

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES).find(
    (key) => key !== "/admin" && pathname.startsWith(key + "/")
  );
  return match ? PAGE_TITLES[match] : "Admin Console";
}

interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
}

export default function AdminHeader({ onOpenMobileMenu }: AdminHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  };

  const title = resolveTitle(pathname);
  const initials =
    profile?.full_name?.substring(0, 2).toUpperCase() ||
    user?.email?.substring(0, 2).toUpperCase() ||
    "AD";

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-850 bg-slate-950/80 backdrop-blur-md">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
              Admin / {title}
            </p>
            <h1 className="font-display text-lg sm:text-xl font-bold text-white truncate">
              {title}
            </h1>
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-lg bg-slate-900/70 border border-slate-850 px-2.5 py-1.5 text-sm font-semibold text-slate-200 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
          >
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-brand-red to-red-700 flex items-center justify-center text-[10px] font-bold text-white uppercase select-none">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="max-w-[140px] truncate text-xs">
                {profile?.full_name?.split(" ")[0] || "Admin"}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-brand-red">
                <Shield className="h-2.5 w-2.5" />
                admin
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-30">
              <div className="px-3 py-2 border-b border-slate-900 mb-1">
                <p className="text-xs font-semibold text-slate-400">Logado como</p>
                <p className="text-sm font-bold text-white truncate">
                  {profile?.full_name || "Administrador"}
                </p>
                <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-brand-red" />
                <span>Sair da Conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
