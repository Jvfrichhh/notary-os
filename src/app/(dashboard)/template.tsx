/**
 * Template dibuat ulang setiap pindah halaman, sehingga animasi masuk
 * (.page-enter di globals.css) diputar lagi untuk halaman yang baru:
 * halaman memudar masuk, lalu bagian-bagiannya muncul bertahap.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
