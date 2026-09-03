"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Mail,
  Shield,
  Calendar,
  LogOut,
  FolderLock,
  UserCheck,
  CheckCircle,
  Link2,
  Link2Off,
  Loader2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import type { Dictionary } from "@/app/[lang]/dictionaries";

type AccountDict = Dictionary["account"];

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

interface ProfileClientProps {
  dict: AccountDict;
  locale: string;
}

interface Integration {
  provider: string;
  provider_user: string;
}

export default function ProfileClient({ dict, locale }: ProfileClientProps) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [githubToken, setGithubToken] = useState("");
  const [githubUser, setGithubUser] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isPt = locale.startsWith("pt");
  const t = {
    githubCardTitle: isPt ? "Integração com GitHub" : "GitHub Integration",
    githubCardSubtitle: isPt 
      ? "Simplifique seu fluxo de contribuição. Conecte sua conta para fazer forks e enviar Pull Requests diretamente do Delphi IDE ou Studio Desktop em um único clique."
      : "Simplify your contribution workflow. Connect your account to fork and submit Pull Requests directly from the Delphi IDE or Studio Desktop in a single click.",
    githubTokenLabel: isPt ? "Token de Acesso Pessoal (PAT)" : "Personal Access Token (PAT)",
    githubUsernameLabel: isPt ? "Usuário do GitHub" : "GitHub Username",
    githubTokenPlaceholder: isPt ? "Insira seu GitHub PAT (ex: ghp_...)" : "Enter your GitHub PAT (e.g., ghp_...)",
    githubUsernamePlaceholder: isPt ? "Seu usuário no GitHub (ex: developper)" : "Your GitHub username (e.g., developer)",
    githubConnectBtn: isPt ? "Conectar GitHub" : "Connect GitHub",
    githubDisconnectBtn: isPt ? "Desconectar Conta" : "Disconnect Account",
    githubConnectedAs: isPt ? "Conectado como" : "Connected as",
    githubTokenRequired: isPt ? "Token e usuário do GitHub são obrigatórios." : "GitHub token and username are required.",
    githubSaveSuccess: isPt ? "Integração com GitHub salva com sucesso!" : "GitHub integration saved successfully!",
    githubDisconnectSuccess: isPt ? "Integração com GitHub removida com sucesso!" : "GitHub integration removed successfully!",
    githubErrorGeneric: isPt ? "Ocorreu um erro ao processar sua solicitação." : "An error occurred while processing your request.",
    githubPatHint: isPt 
      ? "O token requer permissão de gravação ('repo' no Classic PAT ou permissões de Contents/Pull Requests no Fine-grained PAT) para criar repositórios e pull requests em seu nome."
      : "The token requires write permission ('repo' in Classic PAT or Contents/Pull Requests permissions in Fine-grained PAT) to create repositories and pull requests on your behalf.",
    githubPatLinkText: isPt ? "Gerar um novo token no GitHub" : "Generate a new token on GitHub",
    loading: isPt ? "Carregando integrações..." : "Loading integrations..."
  };

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/profile/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Defer to a microtask so no state update runs synchronously inside the effect.
      void Promise.resolve().then(fetchIntegrations);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?next=/profile");
    }
  }, [user, loading, router]);

  const handleLinkGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim() || !githubUser.trim()) {
      setMessage({ type: "error", text: t.githubTokenRequired });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "github",
          accessToken: githubToken.trim(),
          providerUser: githubUser.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.githubErrorGeneric);
      }

      setMessage({ type: "success", text: t.githubSaveSuccess });
      setGithubToken("");
      setGithubUser("");
      await fetchIntegrations();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error && err.message ? err.message : t.githubErrorGeneric });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlinkGithub = async () => {
    if (!window.confirm(isPt ? "Tem certeza que deseja desconectar sua conta do GitHub?" : "Are you sure you want to disconnect your GitHub account?")) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile/integrations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "github",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.githubErrorGeneric);
      }

      setMessage({ type: "success", text: t.githubDisconnectSuccess });
      await fetchIntegrations();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error && err.message ? err.message : t.githubErrorGeneric });
    } finally {
      setSubmitting(false);
    }
  };

  const gitHubIntegration = integrations.find((i) => i.provider === "github");

  if (loading) {
    return (
      <main className="flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">{dict.loading}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const creationDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : dict.details.unavailable;

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "publisher":
        return "bg-brand-blue/10 text-brand-blue border border-brand-blue/20";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "admin":
        return dict.roles.admin;
      case "publisher":
        return dict.roles.publisher;
      default:
        return dict.roles.user;
    }
  };

  return (
    <main className="flex-grow py-16 px-4 md:py-24 relative overflow-hidden bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_70%)]">
      {/* Glow decorative effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[350px] h-[350px] bg-brand-red/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-[350px] h-[350px] bg-brand-blue/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
              {dict.title} <span className="text-brand-red">{dict.titleHighlight}</span>
            </h1>
            <p className="text-slate-400 mt-1">
              {dict.subtitle}{" "}
              <Link href="/dashboard" className="font-mono text-brand-blue hover:underline">
                {dict.myProfileLink}
              </Link>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4 text-brand-red" />
              <span>{dict.signOut}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <div className="md:col-span-1 p-6 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md flex flex-col items-center text-center">
            {/* User Avatar */}
            <div className="h-20 w-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-red to-brand-blue p-[2px] shadow-lg mb-4">
              <div className="h-full w-full bg-slate-950 rounded-2xl flex items-center justify-center font-display text-2xl font-bold text-white">
                {profile?.full_name?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Name & Username */}
            <h2 className="font-display text-xl font-bold text-white leading-tight">
              {profile?.full_name || "PubPascal"}
            </h2>
            <p className="text-sm font-mono text-slate-500 mt-1">
              @{profile?.username || "user"}
            </p>

            {/* Role Badge */}
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mt-4 ${getRoleBadge(profile?.role || "user")}`}>
              <Shield className="h-3 w-3 mr-1" />
              {getRoleLabel(profile?.role || "user")}
            </span>

            {/* Sync check */}
            <div className="mt-8 border-t border-slate-900 w-full pt-6 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold uppercase tracking-wider bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{dict.sync.badge}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {dict.sync.hint}
              </p>
            </div>
          </div>

          {/* Profile Fields / Technical Metadata */}
          <div className="md:col-span-2 space-y-6">
            {/* Account details card */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
              <h3 className="font-display text-lg font-bold text-white mb-6 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-brand-red" />
                <span>{dict.details.heading}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* UUID field */}
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {dict.details.uuid}
                  </p>
                  <p className="text-xs font-mono text-slate-300 bg-slate-900 border border-slate-850 p-2.5 rounded-lg select-all">
                    {user.id}
                  </p>
                </div>

                {/* Email field */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {dict.details.email}
                  </p>
                  <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-slate-500" />
                    {user.email}
                  </p>
                </div>

                {/* Created At field */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {dict.details.createdAt}
                  </p>
                  <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    {creationDate}
                  </p>
                </div>
              </div>
            </div>

            {/* RLS and Publishing Security Card */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
              <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FolderLock className="h-5 w-5 text-brand-blue" />
                <span>{dict.security.heading}</span>
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {dict.security.body}{" "}
                <span className="font-mono text-xs bg-slate-900 p-0.5 rounded text-brand-red">publisher_id</span>{" "}
                {dict.security.bodyTail}
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="h-3.5 w-3.5 text-brand-blue" />
                  <span>{dict.security.readPolicy}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="h-3.5 w-3.5 text-brand-blue" />
                  <span>{dict.security.insertPolicy}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="h-3.5 w-3.5 text-brand-blue" />
                  <span>{dict.security.updateDeletePolicy}</span>
                </div>
              </div>
            </div>

            {/* GitHub Contribution Integration Card */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md relative overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-red/10 rounded-full blur-2xl pointer-events-none" />
              
              <h3 className="font-display text-lg font-bold text-white mb-2 flex items-center gap-2">
                <GithubIcon className="h-5 w-5 text-white" />
                <span>{t.githubCardTitle}</span>
              </h3>
              
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                {t.githubCardSubtitle}
              </p>

              {loadingIntegrations ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
                  <span>{t.loading}</span>
                </div>
              ) : gitHubIntegration ? (
                // Connected State
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                          {t.githubConnectedAs}
                        </p>
                        <a
                          href={`https://github.com/${gitHubIntegration.provider_user}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-white hover:text-brand-blue flex items-center gap-1 mt-0.5 transition-colors group"
                        >
                          <span>@{gitHubIntegration.provider_user}</span>
                          <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-brand-blue transition-colors" />
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={handleUnlinkGithub}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all hover:border-red-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Link2Off className="h-3.5 w-3.5" />
                      )}
                      <span>{t.githubDisconnectBtn}</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Disconnected State (Form)
                <form onSubmit={handleLinkGithub} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        {t.githubUsernameLabel}
                      </label>
                      <input
                        type="text"
                        value={githubUser}
                        onChange={(e) => setGithubUser(e.target.value)}
                        placeholder={t.githubUsernamePlaceholder}
                        required
                        disabled={submitting}
                        className="w-full text-sm font-mono text-slate-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700 focus:border-brand-blue focus:outline-none px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        {t.githubTokenLabel}
                      </label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder={t.githubTokenPlaceholder}
                        required
                        disabled={submitting}
                        className="w-full text-sm font-mono text-slate-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700 focus:border-brand-blue focus:outline-none px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 leading-relaxed bg-slate-900/40 border border-slate-850/50 p-3 rounded-lg flex flex-col gap-1.5">
                    <p>{t.githubPatHint}</p>
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-blue hover:underline inline-flex items-center gap-1 font-semibold self-start"
                    >
                      <span>{t.githubPatLinkText}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-red to-brand-blue hover:from-brand-red/90 hover:to-brand-blue/90 text-white px-4 py-2.5 text-sm font-semibold transition-all shadow-md shadow-brand-red/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    <span>{t.githubConnectBtn}</span>
                  </button>
                </form>
              )}

              {/* Success/Error Message display */}
              {message && (
                <div
                  className={`mt-4 p-3.5 rounded-xl border flex items-start gap-2.5 text-sm transition-all animate-fadeIn ${
                    message.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}
                >
                  {message.type === "error" ? (
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-normal">{message.text}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
