"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { WELCOME_FLAG } from "@/components/motion/WelcomeOverlay";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { OfficeIllustration } from "@/components/motion/OfficeIllustration";

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
      setError(
        res.error === "TOO_MANY_ATTEMPTS"
          ? "Terlalu banyak percobaan gagal. Tunggu 15 menit lalu coba lagi."
          : "Email atau password salah."
      );
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
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <section className="flex flex-col justify-between gap-6 bg-brand-deep px-6 py-8 text-white sm:px-10 lg:w-1/2 lg:gap-8 lg:p-14">
        <div className="flex items-center gap-3">
          <img src="/brand/nexora-mark.png" alt="" className="h-11 w-auto" />
          <span>
            <span className="block text-xl font-bold tracking-[0.28em] text-brand-gold">NEXORA</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-brand-gold/80">Smarter work. Seamless trust.</span>
          </span>
        </div>
        <OfficeIllustration className="mx-auto w-full max-w-[300px] sm:max-w-[420px] lg:max-w-[520px]" />
        <div className="max-w-md">
          <p className="text-xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            Semua pekerjaan kantor notaris, rapi di satu tempat.
          </p>
          <p className="mt-3 hidden text-base leading-relaxed text-white/85 sm:block">
            Klien, pekerjaan, draft akta, arsip protokol, dan tenggat — terpantau setiap hari.
          </p>
        </div>
        <p className="hidden text-sm text-white/80 xl:block">Kantor Notaris &amp; PPAT Ari Yudani Aprianti, S.H., M.Kn. · Kota Bogor</p>
      </section>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="login-enter w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-[0_12px_32px_rgba(16,24,40,.08)] sm:p-8">
        <h1 className="text-[22px] font-extrabold text-foreground">Masuk</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gunakan akun kantor Anda.</p>

        {replaced && (
          <p className="mt-4 rounded-md border border-status-due-soon/40 bg-status-due-soon/10 px-3 py-2 text-sm text-foreground">
            Akun Anda login di perangkat/browser lain, jadi sesi di sini dikeluarkan. Satu akun hanya bisa aktif di satu tempat.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#344054]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-md border border-[#D0D5DD] px-3.5 text-[15px] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              placeholder="Masukkan Email Anda"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#344054]">Password</label>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-md border border-[#D0D5DD] px-3.5 pr-11 text-[15px] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
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
            className="h-12 w-full rounded-md bg-primary text-[15px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground">
          © 2026 Java Fauzan. All rights reserved.
        </p>
      </div>
      </div>
    </div>
  );
}
