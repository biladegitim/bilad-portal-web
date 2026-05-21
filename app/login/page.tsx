"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await apiFetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Email veya şifre hatalı");
        setLoading(false);
        return;
      }

      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      window.location.href = "/";
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError("Sunucuya bağlanılamadı. Backend çalışıyor mu kontrol edin.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-100 px-4 py-8">
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
          <form onSubmit={handleLogin} className="p-6 sm:p-10">
            <div className="mb-8 text-center">
              <div className="mb-6 flex justify-center">
                <img
                  src="/logo.png"
                  alt="Bilad Logo"
                  className="h-28 w-auto object-contain"
                />
              </div>

              <h1 className="text-3xl font-bold text-slate-900">
                Bilad Portal
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Hesabınızla giriş yaparak portala erişin.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@gmail.com"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Şifre
                </label>

                <input
                  type="password"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifreniz"
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-sky-600 p-3.5 font-semibold text-white shadow-sm transition hover:bg-sky-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-5 text-center">
              <p className="text-xs text-slate-400">© Bilad Portal</p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
