"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { WELCOME_FLAG } from "@/components/motion/WelcomeOverlay";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

// useSearchParams butuh Suspense agar halaman login tetap bisa dirender statis.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const replaced = useSearchParams().get("reason") === "elsewhere";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (res?.error) {
      setLoading(false);
      setError("Email atau password salah.");
      return;
    }

    // Sambutan singkat ditampilkan sekali di halaman berikutnya.
    try {
      sessionStorage.setItem(WELCOME_FLAG, "1");
    } catch {
      /* abaikan bila penyimpanan browser tidak tersedia */
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="login-enter w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Notary Operating System</h1>
        <p className="mt-1 text-sm text-muted-foreground">Masuk ke sistem manajemen kantor notaris</p>

        {replaced && (
          <p className="mt-4 rounded-md border border-status-due-soon/40 bg-status-due-soon/10 px-3 py-2 text-sm text-foreground">
            Akun Anda login di perangkat/browser lain, jadi sesi di sini dikeluarkan. Satu akun hanya bisa aktif di satu tempat.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Masukkan Email Anda"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Masukkan Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={showPassword}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-status-overdue">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground">
          © 2026 Java Fauzan. All rights reserved.
        </p>
      </div>
    </div>
  );
}
