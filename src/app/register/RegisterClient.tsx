"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Mail, Lock, User, UserCheck, AlertTriangle, CheckCircle, Info, ArrowRight } from "lucide-react";

function RegisterContent() {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const nextRedirect = searchParams.get("next") ?? "/profile";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Simple validations
    if (!username || !fullName || !email || !password) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    if (username.length < 3) {
      setErrorMsg("O nome de usuário deve ter pelo menos 3 caracteres.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim().toLowerCase(),
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        // If email confirmation is enabled, they need to check email.
        // If not, they are logged in directly.
        const isSessionActive = data.session !== null;

        if (isSessionActive) {
          setSuccessMsg("Conta criada com sucesso! Redirecionando...");
          setTimeout(() => {
            router.push(nextRedirect);
            router.refresh();
          }, 1200);
        } else {
          setSuccessMsg("Registro inicial concluído! Se a confirmação de e-mail estiver ativa, verifique sua caixa de entrada.");
          setEmail("");
          setPassword("");
          setUsername("");
          setFullName("");
        }
      }
    } catch (err: unknown) {
      setErrorMsg("Erro inesperado durante o registro. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextRedirect)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMsg("Erro ao iniciar autenticação via GitHub.");
      setLoading(false);
      console.error(err);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center py-16 px-4 md:py-24 relative overflow-hidden bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_70%)]">
      {/* Glow decorative effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[350px] h-[350px] bg-brand-red/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-[350px] h-[350px] bg-brand-blue/5 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Wrapper */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 backdrop-blur-xl p-8 shadow-2xl">
          {/* Header Form */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
              Criar Conta no <span className="text-brand-red">PubPascal</span>
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Comece a catalogar e compartilhar suas bibliotecas Pascal hoje
            </p>
          </div>

          {/* Notification Boxes */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-200 text-sm flex items-start gap-2.5">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Username field */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Nome de Usuário (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="usuario_delphi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red/40 transition-all"
                />
              </div>
            </div>

            {/* Full Name field */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserCheck className="h-4.5 w-4.5" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Nome Sobrenome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red/40 transition-all"
                />
              </div>
            </div>

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red/40 transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Escolha uma Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red/40 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-lg bg-brand-red hover:bg-brand-red-dark text-white font-bold text-sm px-4 py-2.5 shadow-lg shadow-brand-red/20 transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-brand-red/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registrando...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span>Criar Minha Conta</span>
                  <ArrowRight className="h-4.5 w-4.5" />
                </span>
              )}
            </button>
          </form>

          {process.env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED === "true" && (
            <>
              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-950 px-3 text-slate-500 font-semibold tracking-wider">
                    Ou continue com
                  </span>
                </div>
              </div>

              {/* GitHub OAuth Button */}
              <button
                onClick={handleGitHubLogin}
                disabled={loading}
                type="button"
                className="w-full inline-flex items-center justify-center rounded-lg border border-slate-850 bg-slate-900/60 hover:bg-slate-900 text-slate-200 hover:text-white font-bold text-sm px-4 py-2.5 transition-all hover:scale-[1.01] focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5 mr-2 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                <span>Cadastrar com GitHub</span>
              </button>
            </>
          )}

          {/* Terms and Privacy Info */}
          <div className="mt-5 p-3 rounded-lg bg-slate-900/30 border border-slate-850 text-[10px] text-slate-500 flex items-start gap-2">
            <Info className="h-4 w-4 text-brand-blue shrink-0 mt-0.5" />
            <span>
              Ao se registrar, você concorda em sincronizar sua identidade de desenvolvedor para publicação de pacotes nos termos do ecossistema PubPascal.
            </span>
          </div>

          {/* Redirect Login */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Já possui uma conta?{" "}
            <Link
              href={`/login${nextRedirect !== "/profile" ? `?next=${encodeURIComponent(nextRedirect)}` : ""}`}
              className="text-brand-blue hover:text-brand-blue-light hover:underline font-bold transition-all"
            >
              Fazer Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function RegisterClient() {
  return (
    <Suspense fallback={
      <main className="flex-grow flex items-center justify-center bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_70%)]">
        <div className="h-10 w-10 border-4 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
      </main>
    }>
      <RegisterContent />
    </Suspense>
  );
}
