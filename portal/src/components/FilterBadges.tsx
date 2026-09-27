"use client";

import React from "react";
import { useRouter } from "next/navigation";

export function PlatformBadges() {
  const router = useRouter();

  const platforms = [
    { name: "Windows", icon: "💻" },
    { name: "macOS", icon: "🍏" },
    { name: "Linux", icon: "🐧" },
    { name: "Android", icon: "🤖" },
    { name: "iOS", icon: "📱" },
    { name: "Web", icon: "🌐" }
  ];

  const handlePlatformClick = (platform: string) => {
    router.push(`/packages?platform=${encodeURIComponent(platform)}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {platforms.map((plat) => (
        <button
          key={plat.name}
          onClick={() => handlePlatformClick(plat.name)}
          className="flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-medium text-slate-300 shadow-inner hover:border-slate-600 hover:text-white hover:scale-105 active:scale-95 transition-all"
        >
          <span>{plat.icon}</span>
          <span>{plat.name}</span>
        </button>
      ))}
    </div>
  );
}

export function LanguageBadges() {
  const router = useRouter();

  const technologies = [
    { name: "Delphi", label: "Delphi (Object Pascal)", icon: "🛡️", color: "hover:border-red-500/50 hover:text-red-400" },
    { name: "Lazarus", label: "Lazarus (Free Pascal)", icon: "🐹", color: "hover:border-orange-500/50 hover:text-orange-400" },
    { name: "C++ Builder", label: "C++ Builder", icon: "⚙️", color: "hover:border-blue-500/50 hover:text-blue-400" }
  ];

  const handleTechClick = (tech: string) => {
    router.push(`/packages?language=${encodeURIComponent(tech)}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
      {technologies.map((tech) => (
        <button
          key={tech.name}
          onClick={() => handleTechClick(tech.name)}
          className={`flex items-center gap-2 rounded-xl bg-slate-900/60 border border-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 shadow-md ${tech.color} hover:scale-105 active:scale-95 transition-all`}
        >
          <span>{tech.icon}</span>
          <span>{tech.label}</span>
        </button>
      ))}
    </div>
  );
}
