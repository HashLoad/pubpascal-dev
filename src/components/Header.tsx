"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { localizedHref, type Locale } from "@/utils/localized-href";
import { PlusCircle, LogIn, Menu, X, Package, User, LogOut, ChevronDown, Shield, Search, FolderGit2, KeyRound, Download } from "lucide-react";

const LOCALES = ["pt-BR", "en"] as const satisfies readonly Locale[];

export type HeaderDict = {
  nav: {
    partnerships: string;
    status: string;
    publish: string;
    download: string;
    searchAriaLabel: string;
  };
  userMenu: {
    loggedInAs: string;
    publisherFallback: string;
    myProfile: string;
    myWorkspaces: string;
    myTokens: string;
    account: string;
    signOut: string;
    signIn: string;
    register: string;
  };
  mobile: {
    openMenu: string;
    home: string;
    catalog: string;
    partnerships: string;
    status: string;
    publish: string;
    download: string;
    dashboard: string;
    profile: string;
    workspaces: string;
    tokens: string;
    account: string;
    signOut: string;
    signIn: string;
    register: string;
  };
};

function detectLocale(pathname: string): Locale {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return "en";
}

function buildLocaleHref(pathname: string, target: Locale): string {
  const current = detectLocale(pathname);
  if (pathname === `/${current}` || pathname === `/${current}/`) {
    return `/${target}`;
  }
  if (pathname.startsWith(`/${current}/`)) {
    return `/${target}${pathname.slice(current.length + 1)}`;
  }
  return `/${target}`;
}

function LocaleToggle({ pathname, className }: { pathname: string; className?: string }) {
  const active = detectLocale(pathname);
  return (
    <div className={`flex items-center gap-1 text-xs font-semibold ${className ?? ""}`}>
      <Link
        href={buildLocaleHref(pathname, "pt-BR")}
        aria-current={active === "pt-BR" ? "true" : undefined}
        className={
          active === "pt-BR"
            ? "text-white underline decoration-brand-red decoration-2 underline-offset-4"
            : "text-slate-400 hover:text-white transition-colors"
        }
      >
        PT
      </Link>
      <span className="text-slate-600">|</span>
      <Link
        href={buildLocaleHref(pathname, "en")}
        aria-current={active === "en" ? "true" : undefined}
        className={
          active === "en"
            ? "text-white underline decoration-brand-red decoration-2 underline-offset-4"
            : "text-slate-400 hover:text-white transition-colors"
        }
      >
        EN
      </Link>
    </div>
  );
}

export default function Header({ dict }: { dict: HeaderDict }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  // Close dropdown when clicking outside
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
    setIsMobileMenuOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-brand-slate/80 backdrop-blur-md">
      {/* Top Brand Red Decorative Bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-brand-red to-brand-blue" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-red to-red-700 shadow-md shadow-brand-red/20 transition-transform group-hover:scale-105">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                Pub<span className="text-brand-red transition-colors group-hover:text-red-400">Pascal</span>
                <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  Dev
                </span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href={localizedHref("/partners", detectLocale(pathname))}
              className="text-sm font-medium text-slate-300 hover:text-white hover:underline decoration-brand-red decoration-2 underline-offset-4 transition-colors"
            >
              {dict.nav.partnerships}
            </Link>
            <Link
              href="/portal-status"
              className="text-sm font-medium text-slate-300 hover:text-white hover:underline decoration-brand-red decoration-2 underline-offset-4 transition-colors"
            >
              {dict.nav.status}
            </Link>
            <Link
              href="/publish"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors group"
            >
              <PlusCircle className="h-4 w-4 text-brand-blue group-hover:text-brand-blue-light transition-colors" />
              <span>{dict.nav.publish}</span>
            </Link>
            <Link
              href={localizedHref("/download", detectLocale(pathname))}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors group"
            >
              <Download className="h-4 w-4 text-brand-blue group-hover:text-brand-blue-light transition-colors" />
              <span>{dict.nav.download}</span>
            </Link>
          </nav>

          {/* Actions (Dynamic based on login state) */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href={localizedHref("/packages", detectLocale(pathname))}
              aria-label={dict.nav.searchAriaLabel}
              title={dict.nav.searchAriaLabel}
              className="flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Search className="h-5 w-5" />
            </Link>
            <LocaleToggle pathname={pathname} />
            {loading ? (
              // Prevent layout shift during loading
              <div className="h-9 w-24 bg-slate-900 animate-pulse rounded-md" />
            ) : user ? (
              /* Authenticated User Menu */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg bg-slate-900/60 border border-slate-850 px-3.5 py-1.5 text-sm font-semibold text-slate-200 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                >
                  {/* User Avatar (photo if available, else initials) */}
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-6 w-6 rounded-md object-cover select-none"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-md bg-brand-red flex items-center justify-center text-[10px] font-bold text-white uppercase select-none">
                      {profile?.full_name?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[120px] truncate">
                    {profile?.full_name?.split(" ")[0] || dict.userMenu.publisherFallback}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Card */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-900 mb-1">
                      <p className="text-xs font-semibold text-slate-400">{dict.userMenu.loggedInAs}</p>
                      <p className="text-sm font-bold text-white truncate">{profile?.full_name || dict.userMenu.publisherFallback}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{user.email}</p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-slate-350 hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      <User className="h-4 w-4 text-brand-red" />
                      <span>{dict.userMenu.myProfile}</span>
                    </Link>

                    <Link
                      href="/profile/workspaces"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-slate-350 hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      <FolderGit2 className="h-4 w-4 text-brand-red" />
                      <span>{dict.userMenu.myWorkspaces}</span>
                    </Link>

                    <Link
                      href="/profile/tokens"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-slate-350 hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      <KeyRound className="h-4 w-4 text-brand-red" />
                      <span>{dict.userMenu.myTokens}</span>
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-slate-350 hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      <Shield className="h-4 w-4 text-brand-blue" />
                      <span>{dict.userMenu.account}</span>
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-slate-350 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-brand-red" />
                      <span>{dict.userMenu.signOut}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Anonymous navigation links */
              <>
                <Link 
                  href="/login" 
                  className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{dict.userMenu.signIn}</span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-red/10 transition-all hover:bg-brand-red-dark hover:shadow-brand-red/20 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-brand-red/50"
                >
                  {dict.userMenu.register}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">{dict.mobile.openMenu}</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-brand-slate px-4 py-4 space-y-3" id="mobile-menu">
          <div className="flex items-center justify-end pb-1">
            <LocaleToggle pathname={pathname} />
          </div>
          <Link
            href={localizedHref("/partners", detectLocale(pathname))}
            className="block rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {dict.mobile.partnerships}
          </Link>
          <Link
            href="/portal-status"
            className="block rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {dict.mobile.status}
          </Link>
          <Link
            href="/publish"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <PlusCircle className="h-5 w-5 text-brand-blue" />
            <span>{dict.mobile.publish}</span>
          </Link>
          <Link
            href={localizedHref("/download", detectLocale(pathname))}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Download className="h-5 w-5 text-brand-blue" />
            <span>{dict.mobile.download}</span>
          </Link>
          <Link
            href={localizedHref("/packages", detectLocale(pathname))}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Search className="h-4 w-4" />
            <span>{dict.mobile.catalog}</span>
          </Link>

          <div className="border-t border-slate-800 my-2 pt-2" />

          {loading ? (
            <div className="h-10 w-full bg-slate-900 animate-pulse rounded-md" />
          ) : user ? (
            /* Authenticated Mobile Actions */
            <div className="space-y-2.5">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900/40">
                <p className="text-xs text-slate-500 font-medium">{dict.userMenu.loggedInAs}</p>
                <p className="text-sm font-bold text-white truncate">{profile?.full_name || dict.userMenu.publisherFallback}</p>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="h-5 w-5 text-brand-red" />
                <span>{dict.mobile.profile}</span>
              </Link>
              <Link
                href="/profile/workspaces"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FolderGit2 className="h-5 w-5 text-brand-red" />
                <span>{dict.mobile.workspaces}</span>
              </Link>
              <Link
                href="/profile/tokens"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <KeyRound className="h-5 w-5 text-brand-red" />
                <span>{dict.mobile.tokens}</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Shield className="h-5 w-5 text-brand-blue" />
                <span>{dict.mobile.account}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-red-400 hover:bg-red-500/10 text-left cursor-pointer"
              >
                <LogOut className="h-5 w-5 text-brand-red" />
                <span>{dict.mobile.signOut}</span>
              </button>
            </div>
          ) : (
            /* Anonymous Mobile Actions */
            <div className="space-y-2">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LogIn className="h-5 w-5" />
                <span>{dict.mobile.signIn}</span>
              </Link>
              <Link
                href="/register"
                className="block w-full text-center rounded-md bg-brand-red px-3 py-2 text-base font-semibold text-white hover:bg-brand-red-dark"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {dict.mobile.register}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
