/**
 * Ilustrasi animasi untuk panel kiri halaman login: seseorang bekerja di
 * depan laptop di kantor. Semua gerak berulang terus (mengetik, kaki berayun, berkedip,
 * uap kopi, jarum jam, daun, dokumen yang sedang "diketik" di layar).
 * Murni SVG + CSS (tanpa gambar/skrip); dimatikan bila pengguna memilih
 * "kurangi gerakan" di sistem.
 */
export function OfficeIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 380" className={className} role="img" aria-label="Ilustrasi staf kantor notaris bekerja di depan laptop">
      <style>{`
        .oi-anim, .oi-anim * { transform-box: fill-box; }
        .oi-blink { transform-origin: center; animation: oi-blink 4.2s infinite; }
        .oi-head { transform-origin: 50% 100%; animation: oi-head 6s ease-in-out infinite; }
        .oi-hand-l { animation: oi-type 0.42s ease-in-out infinite alternate; }
        .oi-hand-r { animation: oi-type 0.42s ease-in-out 0.21s infinite alternate; }
        .oi-leg-l { transform-origin: 50% 0%; animation: oi-swing 2.4s ease-in-out infinite; }
        .oi-leg-r { transform-origin: 50% 0%; animation: oi-swing 2.4s ease-in-out 1.2s infinite; }
        .oi-steam { animation: oi-steam 2.8s ease-out infinite; opacity: 0; }
        .oi-steam-2 { animation-delay: 0.9s; }
        .oi-steam-3 { animation-delay: 1.8s; }
        .oi-min { transform-origin: 0% 100%; animation: oi-spin 8s linear infinite; }
        .oi-hour { transform-origin: 0% 100%; animation: oi-spin 96s linear infinite; }
        .oi-leaf-a { transform-origin: 50% 100%; animation: oi-sway 3.6s ease-in-out infinite; }
        .oi-leaf-b { transform-origin: 50% 100%; animation: oi-sway 4.4s ease-in-out 0.6s infinite reverse; }
        .oi-line { transform-origin: 0% 50%; animation: oi-write 6s ease-in-out infinite; transform: scaleX(0); }
        .oi-line-2 { animation-delay: 0.6s; }
        .oi-line-3 { animation-delay: 1.2s; }
        .oi-line-4 { animation-delay: 1.8s; }
        .oi-check { transform-origin: center; animation: oi-pop 6s ease-out infinite; transform: scale(0); }
        .oi-card { animation: oi-float 6s ease-in-out infinite; }
        .oi-glow { animation: oi-glow 3s ease-in-out infinite; }
        .oi-cursor { animation: oi-cursor 1s steps(1) infinite; }
        @keyframes oi-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes oi-head { 0%, 100% { transform: rotate(0deg); } 30% { transform: rotate(-2.5deg); } 65% { transform: rotate(2deg); } }
        @keyframes oi-type { from { transform: translateY(0); } to { transform: translateY(-3px); } }
        @keyframes oi-swing { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
        @keyframes oi-steam { 0% { opacity: 0; transform: translateY(6px); } 25% { opacity: 0.8; } 100% { opacity: 0; transform: translateY(-22px); } }
        @keyframes oi-spin { to { transform: rotate(360deg); } }
        @keyframes oi-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(5deg); } }
        @keyframes oi-write { 0% { transform: scaleX(0); } 22%, 82% { transform: scaleX(1); } 94%, 100% { transform: scaleX(0); } }
        @keyframes oi-pop { 0%, 42% { transform: scale(0); } 50% { transform: scale(1.18); } 56%, 82% { transform: scale(1); } 92%, 100% { transform: scale(0); } }
        @keyframes oi-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes oi-glow { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes oi-cursor { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .oi-anim * { animation: none !important; }
          .oi-line { transform: scaleX(1); }
          .oi-check { transform: scale(1); }
          .oi-steam { opacity: 0.6; }
        }
      `}</style>

      <g className="oi-anim">
        {/* Jendela & lantai */}
        <rect x="24" y="24" width="150" height="104" rx="14" fill="#FFFFFF" opacity="0.08" />
        <path d="M99 24v104M24 76h150" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="3" />
        <rect x="0" y="330" width="480" height="50" fill="#022C22" opacity="0.18" />

        {/* Jam dinding */}
        <g transform="translate(232 62)">
          <circle r="26" fill="#ECFDF5" />
          <circle r="26" fill="none" stroke="#A7F3D0" strokeWidth="4" />
          <rect className="oi-hour" x="-1.5" y="-12" width="3" height="12" rx="1.5" fill="#064E3B" />
          <rect className="oi-min" x="-1" y="-19" width="2" height="19" rx="1" fill="#047857" />
          <circle r="3" fill="#064E3B" />
        </g>

        {/* Kartu dokumen yang sedang diketik */}
        <g className="oi-card">
          <rect x="318" y="44" width="138" height="112" rx="14" fill="#FFFFFF" />
          <rect x="332" y="58" width="56" height="8" rx="4" fill="#047857" />
          <rect className="oi-line" x="332" y="78" width="108" height="6" rx="3" fill="#D1FAE5" />
          <rect className="oi-line oi-line-2" x="332" y="92" width="94" height="6" rx="3" fill="#D1FAE5" />
          <rect className="oi-line oi-line-3" x="332" y="106" width="104" height="6" rx="3" fill="#D1FAE5" />
          <rect className="oi-line oi-line-4" x="332" y="120" width="62" height="6" rx="3" fill="#D1FAE5" />
          <g className="oi-check">
            <circle cx="434" cy="134" r="13" fill="#047857" />
            <path d="M428 134l4 4 8-8" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {/* Kursi */}
        <rect x="178" y="160" width="124" height="150" rx="26" fill="#ECFDF5" opacity="0.16" />

        {/* Badan */}
        <path d="M184 270c0-44 22-72 56-72s56 28 56 72z" fill="#1E293B" />
        <path d="M226 199l14 22 14-22z" fill="#FFFFFF" />
        <rect x="231" y="176" width="18" height="24" rx="6" fill="#E8B48F" />

        {/* Kepala */}
        <g className="oi-head">
          <circle cx="240" cy="150" r="32" fill="#F2C6A0" />
          <path d="M207 150c-2-26 14-42 34-42 21 0 37 14 34 40-6-12-18-20-34-20-14 0-26 8-34 22z" fill="#1F2937" />
          <ellipse cx="208" cy="156" rx="5" ry="8" fill="#E8B48F" />
          <ellipse cx="272" cy="156" rx="5" ry="8" fill="#E8B48F" />
          <g className="oi-blink">
            <ellipse cx="228" cy="156" rx="3.2" ry="4" fill="#1F2937" />
            <ellipse cx="252" cy="156" rx="3.2" ry="4" fill="#1F2937" />
          </g>
          <path d="M232 170q8 6 16 0" fill="none" stroke="#9A5B3B" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Lengan: tangan berada di keyboard, tertutup layar laptop (tidak menembus) */}
        <g className="oi-hand-l">
          <path d="M194 222c-8 10-6 24 14 34" fill="none" stroke="#1E293B" strokeWidth="17" strokeLinecap="round" />
        </g>
        <g className="oi-hand-r">
          <path d="M286 222c8 10 6 24-14 34" fill="none" stroke="#1E293B" strokeWidth="17" strokeLinecap="round" />
        </g>

        {/* Kursi (dudukan) & kaki di bawah meja, berayun pelan */}
        <rect x="196" y="282" width="88" height="10" rx="5" fill="#022C22" opacity="0.55" />
        <rect x="236" y="292" width="8" height="30" rx="3" fill="#022C22" opacity="0.55" />
        <g className="oi-leg-l">
          <rect x="214" y="280" width="16" height="44" rx="7" fill="#334155" />
          <ellipse cx="219" cy="325" rx="13" ry="6" fill="#0F172A" />
        </g>
        <g className="oi-leg-r">
          <rect x="250" y="280" width="16" height="44" rx="7" fill="#3B4A61" />
          <ellipse cx="261" cy="325" rx="13" ry="6" fill="#0F172A" />
        </g>

        {/* Meja */}
        <rect x="56" y="262" width="368" height="14" rx="7" fill="#ECFDF5" />
        <rect x="78" y="276" width="10" height="56" rx="4" fill="#A7F3D0" opacity="0.7" />
        <rect x="392" y="276" width="10" height="56" rx="4" fill="#A7F3D0" opacity="0.7" />

        {/* Laptop (bagian belakang layar menghadap kita) */}
        <rect x="194" y="214" width="92" height="48" rx="7" fill="#F1F5F9" />
        <rect x="194" y="214" width="92" height="48" rx="7" fill="none" stroke="#CBD5E1" strokeWidth="2" />
        <circle className="oi-glow" cx="240" cy="238" r="8" fill="#A7F3D0" />
        <path d="M236.5 238l2.6 2.6 5.4-5.4" fill="none" stroke="#047857" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="184" y="258" width="112" height="7" rx="3.5" fill="#CBD5E1" />

        {/* Kopi */}
        <path className="oi-steam" d="M112 222c-6-8 6-12 0-20" fill="none" stroke="#ECFDF5" strokeWidth="3" strokeLinecap="round" />
        <path className="oi-steam oi-steam-2" d="M122 222c-6-8 6-12 0-20" fill="none" stroke="#ECFDF5" strokeWidth="3" strokeLinecap="round" />
        <path className="oi-steam oi-steam-3" d="M117 220c-6-8 6-12 0-20" fill="none" stroke="#ECFDF5" strokeWidth="3" strokeLinecap="round" />
        <rect x="102" y="230" width="30" height="32" rx="6" fill="#FFFFFF" />
        <path d="M132 238c10 0 10 16 0 16" fill="none" stroke="#FFFFFF" strokeWidth="4" />
        <rect x="102" y="230" width="30" height="7" rx="3" fill="#6B4226" />

        {/* Tumpukan berkas */}
        <rect x="60" y="250" width="34" height="6" rx="2" fill="#FDE68A" />
        <rect x="63" y="244" width="34" height="6" rx="2" fill="#FFFFFF" />
        <rect x="58" y="238" width="34" height="6" rx="2" fill="#BFDBFE" />

        {/* Tanaman */}
        <path className="oi-leaf-a" d="M378 228c-14-14-14-34 2-46 6 18 4 34-2 46z" fill="#6EE7B7" />
        <path className="oi-leaf-b" d="M384 228c6-20 22-30 38-26-6 16-20 26-38 26z" fill="#34D399" />
        <path className="oi-leaf-a" d="M381 228c-4-22 4-40 22-48 0 20-8 36-22 48z" fill="#A7F3D0" />
        <path d="M366 228h32l-5 34h-22z" fill="#FFFFFF" />
        <rect x="363" y="226" width="38" height="7" rx="3" fill="#ECFDF5" />

        {/* Kursor kecil di samping dokumen */}
        <rect className="oi-cursor" x="398" y="118" width="2.5" height="10" rx="1" fill="#047857" />
      </g>
    </svg>
  );
}
