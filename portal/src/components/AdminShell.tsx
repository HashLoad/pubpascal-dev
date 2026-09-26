"use client";

import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-slate text-slate-100 font-sans">
      <AdminSidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <AdminHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_70%)]">
          {children}
        </main>
      </div>
    </div>
  );
}
