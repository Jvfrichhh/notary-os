"use client";

import { Suspense, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { WELCOME_FLAG } from "@/components/motion/WelcomeOverlay";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

// Pesan untuk ?error=... yang dikirim requireClientAccount(). Sengaja tidak
// membedakan "akun tidak ada" vs "password salah" saat login (anti enumerasi);
// pesan spesifik hanya untuk akun yang SUDAH berhasil login lalu dinonaktifkan.
const ERROR_MESSAGES: Record<string, string> = {
  account_inactive: "Akun portal Anda tidak aktif. Silakan hubungi kantor notaris.",
  client_inactive: "Data klien Anda tidak lagi aktif. Silakan hubungi kantor notaris.",
  session_expired: "Sesi Anda berakhir karena password diganti. Silakan masuk lagi dengan password terbaru."
};

function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deniedReason = searchParams.get("error");
  const deniedMessage = deniedReason ? ERROR_MESSAGES[deniedReason] : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("client-credentials", {
      email,
      password,
      redirect: false
    });

    if (res?.error) {
      setLoading(false);
      setError(
        res.error === "TOO_MANY_ATTEMPTS"
          ? "Terlalu banyak percobaan gagal. Tunggu 15 menit lalu coba lagi."
          : "Email atau password salah, atau akun tidak aktif."
      );
      return;
    }

    // Sambutan singkat ditampilkan sekali di halaman berikutnya.
    try {
      sessionStorage.setItem(WELCOME_FLAG, "1");
    } catch {
      /* abaikan bila penyimpanan browser tidak tersedia */
    }
    router.push("/portal");
    router.refresh();
  }

  return (
    <div className="login-enter w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Portal Klien</p>
      <h1 className="mt-1 text-lg font-semibold text-foreground">Notary Operating System</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pantau perkembangan pekerjaan Anda di kantor notaris</p>

      {deniedMessage && (
        <div className="mt-4 rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm text-foreground">
          <p>{deniedMessage}</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/portal/login` })}
            className="mt-2 text-xs font-medium text-primary hover:underline"
          >
            Keluar dari sesi ini
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground">Email</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Email yang didaftarkan kantor"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Password</label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              autoComplete="current-password"
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
          {loading ? "Memproses..." : "Masuk ke Portal"}
        </button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        Belum punya akses? Akun portal dibuatkan oleh kantor notaris. Hubungi kantor untuk mendapatkan akun.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">© 2026 Java Fauzan. All rights reserved.</p>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-8">
      {/* useSearchParams butuh Suspense boundary saat prerender. */}
      <Suspense fallback={null}>
        <PortalLoginForm />
      </Suspense>
    </div>
  );
}
